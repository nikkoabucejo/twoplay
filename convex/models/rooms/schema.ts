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
	visibility: v.optional(roomVisibilityValidator),
	// Undefined/"active" means live and joinable. "closed" once no active seat remains — a player
	// abandoned it, it never filled, or every seat went idle — and permanently un-joinable from then on.
	status: v.optional(v.union(v.literal("active"), v.literal("closed"))),
	// Epoch ms when the room closed, or undefined while still active.
	closedAt: v.optional(v.number()),
	// Why the room closed: "abandoned" — a player left while another was present; "empty" — the
	// second seat never filled before it was swept; "inactive" — every seat went idle at once.
	reason: v.optional(v.union(v.literal("abandoned"), v.literal("empty"), v.literal("inactive")))
})
	.index("byCode", ["code"])
	.index("byVisibility", ["visibility"])
	.index("byStatus", ["status"]);
