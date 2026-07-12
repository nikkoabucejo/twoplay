import type { Cell } from "../../../../../convex/models/games/tictactoe/rules.js";

export type Player = "X" | "O";
export type { Cell };
export type Board = Cell[];
export type GameStatus = "playing" | "won" | "draw";
