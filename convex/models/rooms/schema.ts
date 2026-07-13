import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameTypeValidator } from "../games/index.js";

export const roomVisibilityValidator = v.union(v.literal("private"), v.literal("public"));

// A room is just the lobby: who's in it. It holds no game state itself — that lives in `games`, and
// no per-player state either — that lives on each `players` row — so a room can carry many games
// (one reset each) over its lifetime.
export const roomsTable = defineTable({
	code: v.string(),
	// Which game is played in this room, e.g. "tictactoe" or "checkers".
	type: gameTypeValidator,
	// Ordered; a game's engine derives per-player role (e.g. tictactoe's X/O) from index.
	players: v.array(v.id("players")),
	// Starting clock bank per player, in ms, chosen at room creation. Optional for rooms created before
	// this field existed — those fall back to `DEFAULT_TIME_CONTROL_MS`.
	time: v.optional(v.number()),
	// Whether the room is discoverable on the public rooms browser while it's still waiting for an
	// opponent. Optional for rooms created before this field existed — those are treated as private
	// (excluded from the browser) rather than unexpectedly becoming public.
	visibility: v.optional(roomVisibilityValidator)
})
	.index("byCode", ["code"])
	.index("byVisibility", ["visibility"]);
