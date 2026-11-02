import { defineTable } from "convex/server";
import { v } from "convex/values";
import { gameStateValidator } from "./index.js";

// One row per game instance played in a room. The current game is the one with the highest
// `round` for that room; a reset doesn't mutate it, it starts a new round, so past games
// (and their moves) stay in the database rather than being overwritten.
export const gamesTable = defineTable({
	roomId: v.id("rooms"),
	round: v.number(),
	state: gameStateValidator,
	// Set once the round's score and rating are credited, so a later mutation never credits it twice.
	settledAt: v.optional(v.number()),
	// The round ended with an empty seat or with every seat idle: it counts for nobody.
	isNoContest: v.optional(v.boolean())
}).index("byRoom", ["roomId", "round"]);
