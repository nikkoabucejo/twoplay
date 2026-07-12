import { defineTable } from "convex/server";
import { v } from "convex/values";

export const playersTable = defineTable({
	userId: v.id("users"),
	// Mirrors the owning user's name (kept in sync by `users.store`) — every game-facing display of a
	// participant's name should read this, not join back to `users`.
	name: v.string()
}).index("byUserId", ["userId"]);
