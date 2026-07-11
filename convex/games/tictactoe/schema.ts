import { v } from "convex/values";

const cell = v.union(v.literal("X"), v.literal("O"), v.null());

export const tictactoeState = v.object({
	kind: v.literal("tictactoe"),
	// Nine independent 3x3 boards (twoplay's tictactoe layout), each a flat 9-cell array.
	boards: v.array(v.array(cell)),
	// Board each symbol played on last, so a player can be blocked from repeating their previous board.
	lastBoardBySymbol: v.optional(
		v.object({
			X: v.union(v.number(), v.null()),
			O: v.union(v.number(), v.null())
		})
	)
});

export const tictactoeMove = v.object({
	kind: v.literal("tictactoe"),
	boardIndex: v.number(),
	cellIndex: v.number()
});
