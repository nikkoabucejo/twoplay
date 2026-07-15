import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameTypeValidator } from "../games/index.js";

// A single seat waiting to be paired for a quick match. Rows are deleted the moment a pairing is
// made — the room (see `models/rooms`) becomes the durable record from then on, so this table only
// ever holds currently-waiting entries.
export const pairingsTable = defineTable({
	userId: v.id("users"),
	type: gameTypeValidator,
	time: v.number()
})
	.index("byUser", ["userId"])
	.index("byType", ["type"]);
