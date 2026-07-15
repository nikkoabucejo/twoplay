import { defineSchema } from "convex/server";
import { clocksTable } from "./models/clocks/schema.js";
import { cursorsTable } from "./models/cursors/schema.js";
import { gamesTable } from "./models/games/schema.js";
import { movesTable } from "./models/moves/schema.js";
import { pairingsTable } from "./models/pairings/schema.js";
import { playersTable } from "./models/players/schema.js";
import { ratingsTable } from "./models/ratings/schema.js";
import { resultsTable } from "./models/results/schema.js";
import { roomsTable } from "./models/rooms/schema.js";
import { usersTable } from "./models/users/schema.js";

// Each table's shape lives with its model under `models/`; this file only assembles them —
// Convex requires the schema to be exported from exactly this path.
export default defineSchema({
	users: usersTable,
	players: playersTable,
	rooms: roomsTable,
	games: gamesTable,
	clocks: clocksTable,
	moves: movesTable,
	cursors: cursorsTable,
	ratings: ratingsTable,
	results: resultsTable,
	pairings: pairingsTable
});
