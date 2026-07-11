import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { gameStateValidator, gameTypeValidator } from "./games/index.js";

export default defineSchema({
	users: defineTable({
		name: v.string(),
		externalId: v.string()
	}).index("byExternalId", ["externalId"]),

	rooms: defineTable({
		code: v.string(),
		gameType: gameTypeValidator,
		// Ordered; a game's engine derives per-player role (e.g. tictactoe's X/O) from index.
		playerIds: v.array(v.id("users")),
		state: gameStateValidator
	}).index("byCode", ["code"])
});
