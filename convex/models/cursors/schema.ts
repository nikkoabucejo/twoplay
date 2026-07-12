import { defineTable } from "convex/server";
import { v } from "convex/values";

export const cursorsTable = defineTable({
	roomId: v.id("rooms"),
	playerId: v.id("players"),
	// Normalized to the tracked area (0-1), so it maps consistently across viewers regardless of viewport size.
	x: v.number(),
	y: v.number(),
	updatedAt: v.number()
})
	.index("byRoom", ["roomId"])
	.index("byRoomAndPlayer", ["roomId", "playerId"]);
