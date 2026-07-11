import { v } from "convex/values";
import {
	checkersEngine,
	checkersMove,
	checkersState,
	type CheckersMove,
	type CheckersState
} from "./checkers/index.js";
import {
	tictactoeEngine,
	tictactoeMove,
	tictactoeState,
	type TictactoeMove,
	type TictactoeState
} from "./tictactoe/index.js";

export const gameEngines = {
	tictactoe: tictactoeEngine,
	checkers: checkersEngine
} as const;

export type GameType = keyof typeof gameEngines;
export type GameState = TictactoeState | CheckersState;
export type GameMove = TictactoeMove | CheckersMove;

export const gameTypeValidator = v.union(v.literal("tictactoe"), v.literal("checkers"));
export const gameStateValidator = v.union(tictactoeState, checkersState);
export const gameMoveValidator = v.union(tictactoeMove, checkersMove);

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
	}
}
