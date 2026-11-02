import type { BoardStatus } from "./board.svelte";

export type StripLine =
	"your-turn" | "to-move" | "waiting" | "won" | "lost" | "draw" | "score" | "blank";

/** The viewer sits at the bottom; spectators see seat 0 at the bottom. */
export function stripSeats(myIndex: 0 | 1 | null): { top: 0 | 1; bottom: 0 | 1 } {
	return myIndex === 1 ? { top: 0, bottom: 1 } : { top: 1, bottom: 0 };
}

export function stripLine(status: BoardStatus, seat: 0 | 1, myIndex: 0 | 1 | null): StripLine {
	switch (status.type) {
		case "turn":
			if (status.player !== seat) return "score";
			return seat === myIndex ? "your-turn" : "to-move";
		case "winner":
			return status.player === seat ? "won" : "lost";
		case "draw":
			return "draw";
		case "waiting":
			// The host takes seat 0, so the empty seat is always seat 1.
			if (seat === 0) return "score";
			return status.closed ? "blank" : "waiting";
	}
}

export function ringSeat(status: BoardStatus): 0 | 1 | null {
	return status.type === "turn" ? status.player : null;
}
