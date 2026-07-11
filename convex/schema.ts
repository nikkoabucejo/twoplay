import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { gameStateValidator, gameTypeValidator } from "./games/index.js";

export default defineSchema({
	users: defineTable({
		name: v.string(),
		clerk__userId: v.string()
	}).index("byClerkUserId", ["clerk__userId"]),

	rooms: defineTable({
		code: v.string(),
		game: gameTypeValidator,
		// Ordered; a game's engine derives per-player role (e.g. tictactoe's X/O) from index.
		players: v.array(v.id("users")),
		state: gameStateValidator,
		// Rounds won per player index; persists across resets. Optional for rooms created before this field existed.
		scores: v.optional(v.array(v.number()))
	}).index("byCode", ["code"]),

	cursors: defineTable({
		roomId: v.id("rooms"),
		userId: v.id("users"),
		// Normalized to the tracked area (0-1), so it maps consistently across viewers regardless of viewport size.
		x: v.number(),
		y: v.number(),
		updatedAt: v.number()
	})
		.index("byRoom", ["roomId"])
		.index("byRoomAndUser", ["roomId", "userId"])
});
