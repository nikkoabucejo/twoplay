import type { BoardStatus } from "./board.svelte";

export type StripLine =
	| "reconnecting"
	| "must-capture"
	| "your-turn"
	| "to-move"
	| "waiting"
	| "won"
	| "lost"
	| "draw"
	| "score"
	| "blank";

/** The viewer sits at the bottom; spectators see seat 0 at the bottom. */
export function stripSeats(myIndex: 0 | 1 | null): { top: 0 | 1; bottom: 0 | 1 } {
	return myIndex === 1 ? { top: 0, bottom: 1 } : { top: 1, bottom: 0 };
}

/** `mustCapture`: every legal move on the live turn is a capture. Only the mover's own strip says so.
 *  `isDisconnected`: this seat's player has gone quiet. It shows while the round is in play only, so
 *  a finished round keeps its result. */
export function stripLine(
	status: BoardStatus,
	seat: 0 | 1,
	myIndex: 0 | 1 | null,
	mustCapture = false,
	isDisconnected = false
): StripLine {
	switch (status.type) {
		case "turn":
			if (isDisconnected) return "reconnecting";
			if (status.player !== seat) return "score";
			if (seat !== myIndex) return "to-move";
			return mustCapture ? "must-capture" : "your-turn";
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
