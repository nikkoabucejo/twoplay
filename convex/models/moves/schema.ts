import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameStateValidator } from "../games/index.js";

// One row per move played in a game, so each player can locally scrub through that game's
// history without affecting the live position. Scoped to the game, not the room, so history from
// past games is preserved rather than cleared on reset. Written by `models/rooms` (`play`), read by
// `models/games` (`history`/`countMoves`) — there's no standalone moves API.
export const movesTable = defineTable({
	gameId: v.id("games"),
	// This move's position in the round, 0-indexed — also doubles as turn order. Named distinctly
	// from `GameStatus.turnIndex` (which seat is to move) and `clocks.turnedAt` (a timestamp) so
	// the three don't collide when read together in `rooms/index.ts`.
	turn: v.number(),
	playerId: v.id("players"),
	state: gameStateValidator
}).index("byGame", ["gameId", "turn"]);
