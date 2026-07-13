import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../../_generated/server";
import { clockByGameAndPlayer, clocksByGame } from "../clocks/index.js";
import {
	applyMove,
	countMoves,
	createGame,
	gameMoveValidator,
	gameStatus,
	gameTypeValidator,
	getCurrentGame,
	getEngine,
	getGame,
	roundWinner
} from "../games/index.js";
import { ensurePlayer, playerByUserAndRoom } from "../players/index.js";
import { currentPlayer, getRoomByCode, requirePlayer, requireUser } from "./auth.js";

export { currentPlayer, getRoomByCode, requirePlayer, requireUser };

const CODE_LENGTH = 6;
// No 0/O/1/I/L — avoids ambiguous shared-code typos.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Per-player starting clock bank when a room doesn't specify its own time control. */
export const DEFAULT_TIME_CONTROL_MS = 5 * 60_000;
const MIN_TIME_CONTROL_MS = 10_000;
const MAX_TIME_CONTROL_MS = 60 * 60_000;

/** Clamps a client-supplied time control into a sane range — a raw client value could otherwise be
 *  zero/negative (instant loss for whoever moves first) or `NaN` (silently disables timeouts). */
function resolveTimeControlMs(timeControlMs: number | undefined): number {
	if (timeControlMs === undefined || !Number.isFinite(timeControlMs))
		return DEFAULT_TIME_CONTROL_MS;
	return Math.min(MAX_TIME_CONTROL_MS, Math.max(MIN_TIME_CONTROL_MS, timeControlMs));
}

/** Gets or creates the visitor's player row for `roomId` — mutation-only since it may insert. */
async function ensurePlayerForCurrentUser(ctx: MutationCtx, roomId: Id<"rooms">) {
	const user = await requireUser(ctx);
	return await ensurePlayer(ctx, user._id, roomId, user.name);
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
	args: { type: gameTypeValidator, timeControlMs: v.optional(v.number()) },
	async handler(ctx, { type, timeControlMs }) {
		const code = await generateRoomCode(ctx);
		const resolvedTimeControlMs = resolveTimeControlMs(timeControlMs);
		const roomId = await ctx.db.insert("rooms", {
			code,
			type,
			players: [],
			time: resolvedTimeControlMs
		});
		const player = await ensurePlayerForCurrentUser(ctx, roomId);
		await ctx.db.patch(roomId, { players: [player._id] });
		await createGame(
			ctx,
			{ _id: roomId, type, players: [player._id] },
			resolvedTimeControlMs,
			false
		);
		return code;
	}
});

export const join = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		const user = await requireUser(ctx);
		const existing = await playerByUserAndRoom(ctx, user._id, room._id);
		if (existing) return;

		const engine = getEngine(room.type);
		if (room.players.length >= engine.playerCount) throw new Error("Room is full");

		const player = await ensurePlayer(ctx, user._id, room._id, user.name);
		const players = [...room.players, player._id];
		await ctx.db.patch(room._id, { players });

		// The newcomer's seat had no clock row yet (only seats filled at game-creation time get one) —
		// create it now, and start whichever seat is due to move once every seat is finally filled.
		const game = await getCurrentGame(ctx, room._id);
		if (game) {
			const timeControlMs = room.time ?? DEFAULT_TIME_CONTROL_MS;
			await ctx.db.insert("clocks", {
				gameId: game._id,
				playerId: player._id,
				remaining: timeControlMs
			});

			if (players.length >= engine.playerCount) {
				const status = gameStatus(room.type, game.state);
				const activePlayerId = status && players[status.turnIndex];
				const activeClock =
					activePlayerId && (await clockByGameAndPlayer(ctx, game._id, activePlayerId));
				if (activeClock && activeClock.turnedAt === undefined) {
					await ctx.db.patch(activeClock._id, { turnedAt: Date.now() });
				}
			}
		}
	}
});

export const get = query({
	args: { code: v.string(), round: v.optional(v.number()) },
	async handler(ctx, { code, round }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) return null;

		const viewer = await currentPlayer(ctx, room._id);
		const engine = getEngine(room.type);
		const timeControlMs = room.time ?? DEFAULT_TIME_CONTROL_MS;

		const game = await getGame(ctx, room._id, round);
		if (!game) return null;

		const clocks = await clocksByGame(ctx, game._id);
		const clockByPlayer = new Map(clocks.map((clock) => [clock.playerId, clock]));

		const seatIds = Array.from({ length: engine.playerCount }, (_, i) => room.players[i] ?? null);
		const playerInfos = await Promise.all(
			seatIds.map(async (id) => {
				const player = id ? await ctx.db.get(id) : null;
				return player ? { name: player.name, emoji: player.emoji, score: player.score } : null;
			})
		);

		const myIndex = viewer ? room.players.indexOf(viewer._id) : -1;

		// Whether `game` is the live round — false when `round` pins an older one, so the client
		// can tell a manually-browsed past round apart from the one still being played.
		const currentGame = round === undefined ? game : await getCurrentGame(ctx, room._id);
		const isLive = currentGame !== null && currentGame._id === game._id;

		const remaining = seatIds.map(
			(id) => (id && clockByPlayer.get(id)?.remaining) ?? timeControlMs
		);
		const turnedAt = clocks.find((clock) => clock.turnedAt !== undefined)?.turnedAt;
		const endedSeatIndex = seatIds.findIndex(
			(id) => id !== null && clockByPlayer.get(id)?.endReason !== undefined
		);
		const endedSeatId = endedSeatIndex >= 0 ? seatIds[endedSeatIndex] : null;
		const endReason = (endedSeatId && clockByPlayer.get(endedSeatId)?.endReason) ?? null;

		return {
			code: room.code,
			type: room.type,
			players: playerInfos,
			myIndex: myIndex >= 0 ? myIndex : null,
			game: {
				state: game.state,
				// The specific round instance currently displayed.
				round: game.round,
				// The room's most recent round, so the client can offer round-by-round navigation
				// (e.g. disabling "next" past the latest one) without a separate query.
				latestRound: currentGame?.round ?? game.round,
				isLive,
				// The seat whose round has ended against them, and why — a real clock timeout or a
				// resignation. Distinct causes so the client doesn't mislabel a resignation as a timeout.
				endedSeat: endedSeatIndex >= 0 ? (endedSeatIndex as 0 | 1) : null,
				endReason
			},
			clock: {
				remaining,
				turnedAt: turnedAt ?? null
			}
		};
	}
});

export const play = mutation({
	args: { code: v.string(), move: gameMoveValidator },
	async handler(ctx, { code, move }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		const player = await requirePlayer(ctx, room._id);
		const playerIndex = room.players.indexOf(player._id);
		if (move.kind !== room.type) throw new Error("Move does not match this room's game");

		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error("Game not found");

		const clocks = await clocksByGame(ctx, game._id);
		if (clocks.some((clock) => clock.endReason !== undefined)) {
			throw new Error("This round is already over");
		}

		const beforeStatus = gameStatus(room.type, game.state);
		const actingClock =
			beforeStatus &&
			clocks.find((clock) => clock.playerId === room.players[beforeStatus.turnIndex]);

		// Reject the move outright — rather than silently applying it — if the acting player's clock
		// had already run out before this request landed. Just throws rather than also persisting the
		// timeout here: Convex rolls back every write from a handler that throws, so any patch attempted
		// on this path would never actually commit. The standalone `timeout` mutation is what persists
		// it — the same client's own clock-driven effect calls it moments later once its local display
		// also reads zero.
		let bankedRemaining: number | undefined;
		if (beforeStatus && !beforeStatus.isOver && actingClock?.turnedAt !== undefined) {
			const elapsed = Date.now() - actingClock.turnedAt;
			const remaining = actingClock.remaining - elapsed;
			if (remaining <= 0) throw new Error("Time's up");
			bankedRemaining = remaining;
		}

		const nextState = applyMove(room.type, game.state, playerIndex, move);
		if (nextState === game.state) return;

		const turn = await countMoves(ctx, game._id);
		await ctx.db.patch(game._id, { state: nextState });
		if (actingClock && bankedRemaining !== undefined) {
			await ctx.db.patch(actingClock._id, {
				remaining: bankedRemaining,
				turnedAt: undefined
			});
		}
		await ctx.db.insert("moves", {
			gameId: game._id,
			turn,
			playerId: player._id,
			state: nextState
		});

		const afterStatus = gameStatus(room.type, nextState);
		const nextClock =
			afterStatus && clocks.find((clock) => clock.playerId === room.players[afterStatus.turnIndex]);
		// Only restart a clock when the round is still live — `afterStatus.turnIndex` stays populated
		// even once `isOver` is true, so skipping this check would leave a clock ticking for a round
		// that's already finished.
		if (nextClock && afterStatus && !afterStatus.isOver) {
			await ctx.db.patch(nextClock._id, { turnedAt: Date.now() });
		}
	}
});

/** Starts the room's next round. Only valid once the current one has actually finished — enforced
 *  here (not just by disabling the button client-side) so a direct call can't dodge a loss. Either
 *  seat can trigger it unilaterally; there's no request/accept handshake. */
export const rematch = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		await requirePlayer(ctx, room._id);

		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error("Game not found");

		const clocks = await clocksByGame(ctx, game._id);
		const endedClock = clocks.find((clock) => clock.endReason !== undefined);
		if (!endedClock && !gameStatus(room.type, game.state)?.isOver) {
			throw new Error("This round isn't over yet");
		}
		const winnerIndex = endedClock
			? room.players.indexOf(endedClock.playerId) === 0
				? 1
				: 0
			: roundWinner(room.type, game.state);
		if (winnerIndex !== null) {
			const winnerId = room.players[winnerIndex];
			const winner = await ctx.db.get(winnerId);
			if (winner) await ctx.db.patch(winnerId, { score: winner.score + 1 });
		}

		const timeControlMs = room.time ?? DEFAULT_TIME_CONTROL_MS;
		await createGame(ctx, room, timeControlMs, true);
	}
});
