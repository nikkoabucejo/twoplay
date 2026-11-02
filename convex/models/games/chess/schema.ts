import { v } from "convex/values";

export const chessState = v.object({
	kind: v.literal("chess"),
	fen: v.string(),
	// Position keys since the last capture or pawn move, for threefold repetition; a loaded FEN has no history.
	positions: v.array(v.string())
});

export const chessMove = v.object({
	kind: v.literal("chess"),
	from: v.string(),
	to: v.string(),
	promotion: v.optional(v.union(v.literal("q"), v.literal("r"), v.literal("b"), v.literal("n")))
});
