import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameStateValidator } from "../games/index.js";

// One row per move played in a game, so each player can locally scrub through that game's
// history without affecting the live position. Scoped to the game, not the room, so history from
// past games is preserved rather than cleared on reset. Read and written directly by
// `models/rooms` — there's no standalone moves API.
export const movesTable = defineTable({
	gameId: v.id("games"),
	index: v.number(),
	player: v.id("players"),
	state: gameStateValidator
}).index("byGame", ["gameId", "index"]);
