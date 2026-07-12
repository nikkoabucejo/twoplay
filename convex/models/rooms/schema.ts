import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameTypeValidator } from "../games/index.js";

// A room is just the lobby: who's in it and the running score. It holds no game state itself —
// that lives in `games`, so a room can carry many games (one reset each) over its lifetime.
export const roomsTable = defineTable({
	code: v.string(),
	// Which game is played in this room, e.g. "tictactoe" or "checkers".
	name: gameTypeValidator,
	// Ordered; a game's engine derives per-player role (e.g. tictactoe's X/O) from index.
	players: v.array(v.id("players")),
	// Rounds won per player index; persists across resets. Optional for rooms created before this field existed.
	scores: v.optional(v.array(v.number()))
}).index("byCode", ["code"]);
