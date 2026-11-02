import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameTypeValidator } from "../games/index.js";

// A single seat waiting to be paired for a quick match. Rows are deleted the moment a pairing is
// made — the room (see `models/rooms`) becomes the durable record from then on.
export const pairingsTable = defineTable({
	userId: v.id("users"),
	type: gameTypeValidator,
	time: v.number(),
	// Set by the sweep when nobody claimed the entry in time; kept a while so the owner can be told.
	expiredAt: v.optional(v.number())
})
	.index("byUser", ["userId"])
	// `expiredAt` undefined selects the entries still waiting, oldest first.
	.index("byTypeAndExpired", ["type", "expiredAt"]);
