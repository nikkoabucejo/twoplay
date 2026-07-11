import { v } from "convex/values";
import { tictactoeEngine, tictactoeMove, tictactoeState } from "./tictactoe/index.js";

export const gameEngines = {
	tictactoe: tictactoeEngine
} as const;

export type GameType = keyof typeof gameEngines;

export const gameTypeValidator = v.union(v.literal("tictactoe"));
export const gameStateValidator = v.union(tictactoeState);
export const gameMoveValidator = v.union(tictactoeMove);

export function getEngine(gameType: GameType) {
	return gameEngines[gameType];
}
