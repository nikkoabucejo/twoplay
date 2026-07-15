import { defineTable } from "convex/server";
import { v } from "convex/values";

// One row per player per game — mirrors `clocks`' shape, since each seat's outcome for a round is
// its own independent fact.
export const resultsTable = defineTable({
	gameId: v.id("games"),
	playerId: v.id("players"),
	// Set the moment this player's round ends via a real clock timeout, a resignation, or an
	// abandonment — never set for a natural win/loss/draw read straight off the board state. Blocks
	// further moves and distinguishes causes for the client, the same role `clocks.reason` used to play.
	state: v.optional(v.union(v.literal("timeout"), v.literal("resign"), v.literal("abandon"))),
	// Signed MMR change applied to this player for this round — set once the round is actually
	// settled (`rematch`/`forfeitRoom` crediting a winner). Undefined until then, and left undefined
	// forever for a drawn round, since a draw never changes either side's rating.
	mmr: v.optional(v.number())
})
	.index("byGame", ["gameId"])
	.index("byGameAndPlayer", ["gameId", "playerId"]);
