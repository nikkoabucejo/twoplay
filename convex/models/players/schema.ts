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
	emoji: v.string(),
	// Epoch ms when this player abandoned the room, or undefined while still an active member. The
	// row itself is never deleted — history reads it — this just marks the membership as over.
	leftAt: v.optional(v.number()),
	// Epoch ms of this player's last heartbeat, for opponent "disconnected" detection and the idle
	// sweep. Undefined before their first heartbeat.
	seenAt: v.optional(v.number())
})
	.index("byUserAndRoom", ["userId", "roomId"])
	.index("byUser", ["userId"]);
