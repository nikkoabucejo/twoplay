import { defineTable } from "convex/server";
import { v } from "convex/values";

// One row per player per game — each player's clock ticks independently, so this is keyed by
// (gameId, playerId) rather than living as a per-seat array on `games`.
export const clocksTable = defineTable({
	gameId: v.id("games"),
	playerId: v.id("players"),
	// Remaining clock bank, in ms, as of `turnedAt`.
	remaining: v.number(),
	// Epoch ms when this player's countdown began. Undefined while frozen — not their turn, waiting
	// for both seats to be filled, or the round is over.
	turnedAt: v.optional(v.number()),
	// Set once this round has ended against this player — either their clock hit zero or they
	// resigned. Blocks further moves in the round; distinguishes the two causes for the client.
	endReason: v.optional(v.union(v.literal("timeout"), v.literal("resign")))
})
	.index("byGame", ["gameId"])
	.index("byGameAndPlayer", ["gameId", "playerId"]);
