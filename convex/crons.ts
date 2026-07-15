import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";

const crons = cronJobs();

// Closes rooms whose second seat never filled, and forfeits/closes rooms with silent seats — see
// `sweep` (convex/models/rooms/index.ts) for the thresholds and per-case logic.
crons.interval("sweep inactive rooms", { minutes: 2 }, internal.models.rooms.index.sweep);

// Clears pairing queue entries nobody ever claimed — see `sweep` (convex/models/pairings/index.ts).
crons.interval("sweep stale pairing entries", { minutes: 2 }, internal.models.pairings.index.sweep);

export default crons;
