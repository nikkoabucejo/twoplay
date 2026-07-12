import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
	applyMove,
	gameMoveValidator,
	gameStatus,
	gameTypeValidator,
	getEngine,
	roundWinner,
	type GameType
} from "./games/index.js";
import { userByClerkUserId } from "./users.js";

const CODE_LENGTH = 6;
// No 0/O/1/I/L — avoids ambiguous shared-code typos.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export async function requireUser(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error("Sign in to play");

	const user = await userByClerkUserId(ctx, identity.subject);
	if (!user) throw new Error("Sign in to play");

	return user;
}

export async function getRoomByCode(ctx: QueryCtx | MutationCtx, code: string) {
	return await ctx.db
		.query("rooms")
		.withIndex("byCode", (q) => q.eq("code", code))
		.unique();
}

/** The room's live game — the one with the highest `round`. */
async function getCurrentGame(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
	return await ctx.db
		.query("games")
		.withIndex("byRoom", (q) => q.eq("roomId", roomId))
		.order("desc")
		.first();
}

/** A specific past or present round, or the live game when `round` is omitted. */
async function getGame(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">, round?: number) {
	if (round === undefined) return await getCurrentGame(ctx, roomId);
	return await ctx.db
		.query("games")
		.withIndex("byRoom", (q) => q.eq("roomId", roomId).eq("round", round))
		.unique();
}

async function createGame(ctx: MutationCtx, roomId: Id<"rooms">, name: GameType) {
	const previous = await getCurrentGame(ctx, roomId);
	return await ctx.db.insert("games", {
		roomId,
		round: previous ? previous.round + 1 : 1,
		state: getEngine(name).createInitialState()
	});
}

/** How many moves have been played in a game — also next move's `moves.index`. */
async function countMoves(ctx: QueryCtx | MutationCtx, gameId: Id<"games">): Promise<number> {
	const moves = await ctx.db
		.query("moves")
		.withIndex("byGame", (q) => q.eq("gameId", gameId))
		.collect();
	return moves.length;
}

function scoresOf(room: { scores?: number[] }, engine: { playerCount: number }): number[] {
	return room.scores ?? Array(engine.playerCount).fill(0);
}

async function generateRoomCode(ctx: MutationCtx): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		let code = "";
		for (let i = 0; i < CODE_LENGTH; i++) {
			code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
		}
		if (!(await getRoomByCode(ctx, code))) return code;
	}
	throw new Error("Could not generate a unique room code, please try again");
}

export const create = mutation({
	args: { name: gameTypeValidator },
	async handler(ctx, { name }) {
		const user = await requireUser(ctx);
		const code = await generateRoomCode(ctx);
		const engine = getEngine(name);
		const roomId = await ctx.db.insert("rooms", {
			code,
			name,
			players: [user._id],
			scores: Array(engine.playerCount).fill(0)
		});
		await createGame(ctx, roomId, name);
		return code;
	}
});

export const join = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		if (room.players.includes(user._id)) return;

		const engine = getEngine(room.name);
		if (room.players.length >= engine.playerCount) throw new Error("Room is full");

		await ctx.db.patch(room._id, { players: [...room.players, user._id] });
	}
});

export const get = query({
	args: { code: v.string(), round: v.optional(v.number()) },
	async handler(ctx, { code, round }) {
		const viewer = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) return null;

		const engine = getEngine(room.name);
		const playerInfos = await Promise.all(
			Array.from({ length: engine.playerCount }, (_, i) => room.players[i] ?? null).map((id) =>
				id ? ctx.db.get(id) : null
			)
		);

		const myIndex = room.players.indexOf(viewer._id);
		const game = await getGame(ctx, room._id, round);
		if (!game) return null;

		// Whether `game` is the live round — false when `round` pins an older one, so the client
		// can tell a manually-browsed past round apart from the one still being played.
		const currentGame = round === undefined ? game : await getCurrentGame(ctx, room._id);
		const isLive = currentGame !== null && currentGame._id === game._id;

		return {
			code: room.code,
			name: room.name,
			players: playerInfos.map((p) => (p ? { name: p.name } : null)),
			myIndex: myIndex >= 0 ? myIndex : null,
			state: game.state,
			// The specific round/game instance currently displayed.
			game: game.round,
			// The room's most recent round, so the client can offer round-by-round navigation
			// (e.g. disabling "next" past the latest one) without a separate query.
			round: currentGame?.round ?? game.round,
			isLive,
			scores: scoresOf(room, engine)
		};
	}
});

export const play = mutation({
	args: { code: v.string(), move: gameMoveValidator },
	async handler(ctx, { code, move }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		const playerIndex = room.players.indexOf(user._id);
		if (playerIndex === -1) throw new Error("You are not a player in this room");
		if (move.kind !== room.name) throw new Error("Move does not match this room's game");

		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error("Game not found");

		const nextState = applyMove(room.name, game.state, playerIndex, move);
		if (nextState === game.state) return;

		const index = await countMoves(ctx, game._id);
		await ctx.db.patch(game._id, { state: nextState });
		await ctx.db.insert("moves", { gameId: game._id, index, player: user._id, state: nextState });
	}
});

/** Ordered history of moves played in a room's game — the current one when `round` is omitted. */
export const history = query({
	args: { code: v.string(), round: v.optional(v.number()) },
	async handler(ctx, { code, round }) {
		await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) return [];

		const game = await getGame(ctx, room._id, round);
		if (!game) return [];

		return await ctx.db
			.query("moves")
			.withIndex("byGame", (q) => q.eq("gameId", game._id))
			.order("asc")
			.collect();
	}
});

/** Starts the room's next round. Only valid once the current one has actually finished — enforced
 *  here (not just by disabling the button client-side) so a direct call can't dodge a loss. */
export const newGame = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		if (!room.players.includes(user._id)) {
			throw new Error("You are not a player in this room");
		}

		const engine = getEngine(room.name);
		const scores = scoresOf(room, engine);
		const game = await getCurrentGame(ctx, room._id);
		if (game) {
			if (!gameStatus(room.name, game.state)?.isOver) {
				throw new Error("This round isn't over yet");
			}
			const winnerIndex = roundWinner(room.name, game.state);
			if (winnerIndex !== null) scores[winnerIndex] += 1;
		}

		await ctx.db.patch(room._id, { scores });
		await createGame(ctx, room._id, room.name);
	}
});
