import { defineTable } from "convex/server";
import { v } from "convex/values";

// One row per user — a single rating across every game on the platform, not split per game type.
// Created lazily the first time a user finishes a round of any game.
export const ratingsTable = defineTable({
	userId: v.id("users"),
	rating: v.number()
}).index("byUser", ["userId"]);
