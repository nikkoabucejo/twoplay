import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../../_generated/server";
import { clocksByGame } from "../clocks/index.js";
import { applyResult } from "../ratings/index.js";
import { getRoomByCode, isRoomActive, requirePlayer, requireUser } from "../rooms/auth.js";
import { creditMmr, markEnded, resultsByGame } from "../results/index.js";
import {
	checkersEngine,
	checkersMove,
	checkersState,
	type CheckersMove,
	type CheckersState
} from "./checkers/index.js";
import {
	chessEngine,
	chessMove,
	chessState,
	type ChessMove,
	type ChessState
} from "./chess/index.js";
import { otherPlayer } from "./engine.js";
export type { GameEngine, GameStatus } from "./engine.js";
import {
	tictactoeEngine,
	tictactoeMove,
	tictactoeState,
	type TictactoeMove,
	type TictactoeState
} from "./tictactoe/index.js";

export const gameEngines = {
	tictactoe: tictactoeEngine,
	checkers: checkersEngine,
	chess: chessEngine
} as const;

export type GameType = keyof typeof gameEngines;
export type GameState = TictactoeState | CheckersState | ChessState;
export type GameMove = TictactoeMove | CheckersMove | ChessMove;

export const gameTypeValidator = v.union(
	v.literal("tictactoe"),
	v.literal("checkers"),
	v.literal("chess")
);
export const gameStateValidator = v.union(tictactoeState, checkersState, chessState);
export const gameMoveValidator = v.union(tictactoeMove, checkersMove, chessMove);

export function getEngine(gameType: GameType) {
	return gameEngines[gameType];
}

/**
 * Dispatches to the matching engine's `applyMove`. A generic `getEngine(gameType).applyMove(state, ...)`
 * call doesn't type-check once there's more than one game: TypeScript can't correlate a union-typed
 * `state`/`move` with a union-typed engine, so it collapses the parameter type to `never`. Switching on
 * the literal `gameType` narrows `state` and `move` to the one engine that's actually being called.
 */
export function applyMove(
	gameType: GameType,
	state: GameState,
	playerIndex: number,
	move: GameMove
): GameState {
	switch (gameType) {
		case "tictactoe": {
			if (state.kind !== "tictactoe" || move.kind !== "tictactoe") {
				throw new Error("Move does not match this room's game");
			}
			return tictactoeEngine.applyMove(state, playerIndex, move);
		}
		case "checkers": {
			if (state.kind !== "checkers" || move.kind !== "checkers") {
				throw new Error("Move does not match this room's game");
			}
			return checkersEngine.applyMove(state, playerIndex, move);
		}
		case "chess": {
			if (state.kind !== "chess" || move.kind !== "chess") {
				throw new Error("Move does not match this room's game");
			}
			return chessEngine.applyMove(state, playerIndex, move);
		}
	}
}

/** Dispatches to the matching engine's `roundWinner`, for the same reason `applyMove` above does. */
export function roundWinner(gameType: GameType, state: GameState): number | null {
	switch (gameType) {
		case "tictactoe": {
			if (state.kind !== "tictactoe") throw new Error("State does not match this room's game");
			return tictactoeEngine.roundWinner(state);
		}
		case "checkers": {
			if (state.kind !== "checkers") throw new Error("State does not match this room's game");
			return checkersEngine.roundWinner(state);
		}
		case "chess": {
			if (state.kind !== "chess") throw new Error("State does not match this room's game");
			return chessEngine.roundWinner(state);
		}
	}
}

/** Dispatches to the matching engine's `status`, for the same reason `applyMove` above does. */
export function gameStatus(gameType: GameType, state: GameState) {
	switch (gameType) {
		case "tictactoe": {
			if (state.kind !== "tictactoe") throw new Error("State does not match this room's game");
			return tictactoeEngine.status(state);
		}
		case "checkers": {
			if (state.kind !== "checkers") throw new Error("State does not match this room's game");
			return checkersEngine.status(state);
		}
		case "chess": {
			if (state.kind !== "chess") throw new Error("State does not match this room's game");
			return chessEngine.status(state);
		}
	}
}

/** The room's live game — the one with the highest `round`. */
export async function getCurrentGame(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
	return await ctx.db
		.query("games")
		.withIndex("byRoom", (q) => q.eq("roomId", roomId))
		.order("desc")
		.first();
}

/** A specific past or present round, or the live game when `round` is omitted or doesn't exist. */
export async function getGame(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">, round?: number) {
	if (round === undefined) return await getCurrentGame(ctx, roomId);
	const game = await ctx.db
		.query("games")
		.withIndex("byRoom", (q) => q.eq("roomId", roomId).eq("round", round))
		.unique();
	return game ?? (await getCurrentGame(ctx, roomId));
}

/** `shouldStartClock` is false right after room creation (only one seat is filled yet) and true for
 *  every later round (both seats are necessarily already filled — a round can only finish once they
 *  are). Only creates clock rows for seats already filled in `room.players`; `join` creates the
 *  latecomer's once they take the last seat. */
export async function createGame(
	ctx: MutationCtx,
	room: Pick<Doc<"rooms">, "_id" | "type" | "players">,
	timeControlMs: number,
	shouldStartClock: boolean
) {
	const previous = await getCurrentGame(ctx, room._id);
	const state = getEngine(room.type).createInitialState();
	const gameId = await ctx.db.insert("games", {
		roomId: room._id,
		round: previous ? previous.round + 1 : 1,
		state
	});

	const status = gameStatus(room.type, state);
	await Promise.all(
		room.players.map((playerId, index) =>
			ctx.db.insert("clocks", {
				gameId,
				playerId,
				remaining: timeControlMs,
				turnedAt: shouldStartClock && status?.turnIndex === index ? Date.now() : undefined
			})
		)
	);

	return gameId;
}

/** Ends a running round on timeout against the seat to move once its clock has run out on the
 *  server. Called before anything else ends a round, so an expired seat can't dodge the loss by
 *  outlasting its opponent's heartbeat. Returns whether it ended the round. */
export async function claimExpiredClock(
	ctx: MutationCtx,
	room: Doc<"rooms">,
	game: Doc<"games">
): Promise<boolean> {
	const results = await resultsByGame(ctx, game._id);
	if (results.some((result) => result.state !== undefined)) return false;

	const status = gameStatus(room.type, game.state);
	if (status.isOver) return false;

	const clocks = await clocksByGame(ctx, game._id);
	const activeClock = clocks.find((clock) => clock.playerId === room.players[status.turnIndex]);
	if (!activeClock || activeClock.turnedAt === undefined) return false;
	if (activeClock.remaining - (Date.now() - activeClock.turnedAt) > 0) return false;

	await ctx.db.patch(activeClock._id, { remaining: 0, turnedAt: undefined });
	await markEnded(ctx, game._id, activeClock.playerId, "timeout");
	return true;
}

/** The winning seat of an ended round: the opponent of a seat that ended it early (timeout, resign,
 *  abandon), else the board's winner. Null for a draw. */
export function roundWinnerIndex(
	room: Pick<Doc<"rooms">, "type" | "players">,
	game: Pick<Doc<"games">, "state">,
	results: Doc<"results">[]
): number | null {
	const endedResult = results.find((result) => result.state !== undefined);
	return endedResult
		? otherPlayer(room.players.indexOf(endedResult.playerId))
		: roundWinner(room.type, game.state);
}

/** Credits a round that has ended, exactly once: stops its clocks, then adds the winner's point and
 *  both rating changes, or marks it no-contest when a seat is empty. An unfinished round is left
 *  alone unless `shouldVoidIfUnfinished` is set, which makes it no-contest. Concurrent calls conflict
 *  in Convex's serializable transactions, so the retry sees `settledAt` and stops. */
export async function settleRound(
	ctx: MutationCtx,
	room: Doc<"rooms">,
	game: Doc<"games">,
	options: { shouldVoidIfUnfinished?: boolean } = {}
) {
	if (game.settledAt !== undefined) return;

	const results = await resultsByGame(ctx, game._id);
	const endedResult = results.find((result) => result.state !== undefined);
	const isOver = endedResult !== undefined || gameStatus(room.type, game.state).isOver;
	if (!isOver && !options.shouldVoidIfUnfinished) return;

	const now = Date.now();
	for (const clock of await clocksByGame(ctx, game._id)) {
		if (clock.turnedAt === undefined) continue;
		await ctx.db.patch(clock._id, {
			remaining: Math.max(0, clock.remaining - (now - clock.turnedAt)),
			turnedAt: undefined
		});
	}

	if (!isOver || room.players.length < getEngine(room.type).playerCount) {
		await ctx.db.patch(game._id, { settledAt: now, isNoContest: true });
		return;
	}

	const winnerIndex = roundWinnerIndex(room, game, results);
	if (winnerIndex !== null) {
		const winnerId = room.players[winnerIndex];
		const loserId = room.players[otherPlayer(winnerIndex)];
		const [winner, loser] = await Promise.all([ctx.db.get(winnerId), ctx.db.get(loserId)]);
		if (winner && loser) {
			await ctx.db.patch(winnerId, { score: winner.score + 1 });
			const { winnerMmr, loserMmr } = await applyResult(ctx, winner.userId, loser.userId);
			await creditMmr(ctx, game._id, winnerId, winnerMmr);
			await creditMmr(ctx, game._id, loserId, loserMmr);
		}
	}
	await ctx.db.patch(game._id, { settledAt: now });
}

/** How many moves have been played in a game — also next move's `moves.turn`. */
export async function countMoves(
	ctx: QueryCtx | MutationCtx,
	gameId: Id<"games">
): Promise<number> {
	const moves = await ctx.db
		.query("moves")
		.withIndex("byGame", (q) => q.eq("gameId", gameId))
		.collect();
	return moves.length;
}

/** Forfeits the caller's own current round in favor of their opponent — marks the same `results`
 *  state a real clock timeout sets, tagged with the distinct "resign" cause, since both end a round
 *  identically from there on but the client still needs to tell them apart when displaying why. */
export const resign = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		if (!isRoomActive(room)) throw new Error("This room is no longer active");
		const player = await requirePlayer(ctx, room._id);
		if (room.players.length < getEngine(room.type).playerCount) {
			throw new Error("Waiting for opponent");
		}

		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error("Game not found");

		const results = await resultsByGame(ctx, game._id);
		if (results.some((result) => result.state !== undefined)) return;
		const status = gameStatus(room.type, game.state);
		if (!status || status.isOver) return;

		const clocks = await clocksByGame(ctx, game._id);
		const ownClock = clocks.find((clock) => clock.playerId === player._id);
		if (!ownClock) throw new Error("You are not playing this round");

		await markEnded(ctx, game._id, player._id, "resign");
		await settleRound(ctx, room, game);
	}
});

/** Ends the current round in favor of whoever's opponent let their clock run out. Re-derives elapsed
 *  time server-side rather than trusting the caller's claim — any connected client (either player, or a
 *  spectator) can call this once it locally computes a seat's clock has hit zero. */
export const timeout = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		if (!isRoomActive(room)) return;

		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error("Game not found");

		if (await claimExpiredClock(ctx, room, game)) await settleRound(ctx, room, game);
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
