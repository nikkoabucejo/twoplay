import { v } from "convex/values";

const pieceColor = v.union(v.literal("cyan"), v.literal("pink"));
const piece = v.object({ color: pieceColor, king: v.boolean() });
const square = v.union(piece, v.null());

export const checkersState = v.object({
	kind: v.literal("checkers"),
	// 64 squares, row-major (index = row * 8 + col); only dark squares are ever occupied.
	board: v.array(square),
	turn: pieceColor,
	// Index of a piece mid multi-jump; only that piece may move until the capture chain ends.
	mustContinueFrom: v.union(v.number(), v.null())
});

export const checkersMove = v.object({
	kind: v.literal("checkers"),
	from: v.number(),
	to: v.number()
});
