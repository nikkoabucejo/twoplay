import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
	applyMove,
	gameMoveValidator,
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
	args: { game: gameTypeValidator },
	async handler(ctx, { game }) {
		const user = await requireUser(ctx);
		const code = await generateRoomCode(ctx);
		const engine = getEngine(game as GameType);
		await ctx.db.insert("rooms", {
			code,
			game,
			players: [user._id],
			state: engine.createInitialState(),
			scores: Array(engine.playerCount).fill(0)
		});
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

		const engine = getEngine(room.game as GameType);
		if (room.players.length >= engine.playerCount) throw new Error("Room is full");

		await ctx.db.patch(room._id, { players: [...room.players, user._id] });
	}
});

export const get = query({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) return null;

		const identity = await ctx.auth.getUserIdentity();
		const viewer = identity ? await userByClerkUserId(ctx, identity.subject) : null;

		const engine = getEngine(room.game as GameType);
		const playerInfos = await Promise.all(
			Array.from({ length: engine.playerCount }, (_, i) => room.players[i] ?? null).map((id) =>
				id ? ctx.db.get(id) : null
			)
		);

		const myIndex = viewer ? room.players.indexOf(viewer._id) : -1;

		return {
			code: room.code,
			game: room.game,
			players: playerInfos.map((p) => (p ? { name: p.name } : null)),
			myIndex: myIndex >= 0 ? myIndex : null,
			state: room.state,
			scores: room.scores ?? Array(engine.playerCount).fill(0)
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
		if (move.kind !== room.game) throw new Error("Move does not match this room's game");

		const nextState = applyMove(room.game as GameType, room.state, playerIndex, move);
		if (nextState === room.state) return;

		await ctx.db.patch(room._id, { state: nextState });
	}
});

export const reset = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		if (!room.players.includes(user._id)) {
			throw new Error("You are not a player in this room");
		}

		const engine = getEngine(room.game as GameType);
		const scores = room.scores ?? Array(engine.playerCount).fill(0);
		const winnerIndex = roundWinner(room.game as GameType, room.state);
		if (winnerIndex !== null) scores[winnerIndex] += 1;

		await ctx.db.patch(room._id, { state: engine.createInitialState(), scores });
	}
});
