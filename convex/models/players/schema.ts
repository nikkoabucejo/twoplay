import { defineTable } from "convex/server";
import { v } from "convex/values";

// One row per user per room — a user joining a second room gets a second, independent player row,
// not a shared identity across rooms.
export const playersTable = defineTable({
	userId: v.id("users"),
	roomId: v.id("rooms"),
	// Snapshot of the owning user's name at the moment they joined this room — every game-facing
	// display of a participant's name should read this, not join back to `users`. A later rename
	// doesn't retroactively change how they appear in rooms they've already joined.
	name: v.string(),
	// Rounds won in this room; persists across resets/rematches within it.
	score: v.number(),
	// Status-bar emoji — scoped to this room's player row, not the user's identity, so the same
	// person can pick differently in a different room.
	emoji: v.string()
}).index("byUserAndRoom", ["userId", "roomId"]);
