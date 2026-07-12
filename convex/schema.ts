import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { gameStateValidator, gameTypeValidator } from "./games/index.js";

export default defineSchema({
	users: defineTable({
		name: v.string(),
		clerk__userId: v.string()
	}).index("byClerkUserId", ["clerk__userId"]),

	// A room is just the lobby: who's in it and the running score. It holds no game state itself —
	// that lives in `games`, so a room can carry many games (one reset each) over its lifetime.
	rooms: defineTable({
		code: v.string(),
		// Which game is played in this room, e.g. "tictactoe" or "checkers".
		name: gameTypeValidator,
		// Ordered; a game's engine derives per-player role (e.g. tictactoe's X/O) from index.
		players: v.array(v.id("users")),
		// Rounds won per player index; persists across resets. Optional for rooms created before this field existed.
		scores: v.optional(v.array(v.number()))
	}).index("byCode", ["code"]),

	// One row per game instance played in a room. The current game is the one with the highest
	// `round` for that room; a reset doesn't mutate it, it starts a new round, so past games
	// (and their moves) stay in the database rather than being overwritten.
	games: defineTable({
		roomId: v.id("rooms"),
		round: v.number(),
		state: gameStateValidator
	}).index("byRoom", ["roomId", "round"]),

	// One row per move played in a game, so each player can locally scrub through that game's
	// history without affecting the live position. Scoped to the game, not the room, so history from
	// past games is preserved rather than cleared on reset.
	moves: defineTable({
		gameId: v.id("games"),
		index: v.number(),
		player: v.id("users"),
		state: gameStateValidator
	}).index("byGame", ["gameId", "index"]),

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
