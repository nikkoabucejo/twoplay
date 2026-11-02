import type { GameType } from "../../../../../convex/models/games/index.js";

export type PlayViewKind = "checking" | "setup" | "pending" | "waiting" | "queued" | "playing";
export type PlayView = { kind: PlayViewKind; redirect: string | null };

type PlayViewInput = {
	/** `rooms.active`: `undefined` while loading. */
	room: { code: string; type: GameType } | null | undefined;
	/** Seats in `room` from `rooms.get`: `undefined` while loading. */
	seatCount: number | undefined;
	isQueued: boolean;
	/** This page queued or created the room, so a match opens it instead of showing the card. */
	startedHere: boolean;
	isPending: boolean;
};

/** Convex applies a mutation's query updates before its promise resolves, so `room` shows the new
 *  room while `create` is still awaited; `isPending` keeps the view on the button until then. */
export function playView({
	room,
	seatCount,
	isQueued,
	startedHere,
	isPending
}: PlayViewInput): PlayView {
	if (room === undefined) return { kind: "checking", redirect: null };
	if (isPending) return { kind: "pending", redirect: null };
	if (room) {
		if (seatCount === undefined)
			return { kind: startedHere ? "pending" : "checking", redirect: null };
		if (seatCount < 2) return { kind: "waiting", redirect: null };
		if (startedHere) return { kind: "pending", redirect: `/${room.type}/${room.code}` };
		return { kind: "playing", redirect: null };
	}
	return { kind: isQueued ? "queued" : "setup", redirect: null };
}
