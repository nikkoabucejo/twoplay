import type { GameType } from "../../../../../convex/models/games/index.js";

export type PlayViewKind = "checking" | "setup" | "pending" | "waiting" | "queued";
export type PlayView = { kind: PlayViewKind; redirect: string | null };

type PlayViewInput = {
	/** `rooms.active`: `undefined` while loading. */
	room: { code: string; type: GameType } | null | undefined;
	/** Seats in `room` from `rooms.get`: `undefined` while loading. */
	seatCount: number | undefined;
	isQueued: boolean;
	/** This page created the room, so it waits there for an opponent. Any other room redirects. */
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
		const redirect = `/${room.type}/${room.code}`;
		if (!startedHere) return { kind: "checking", redirect };
		if (seatCount === undefined) return { kind: "pending", redirect: null };
		if (seatCount < 2) return { kind: "waiting", redirect: null };
		return { kind: "pending", redirect };
	}
	return { kind: isQueued ? "queued" : "setup", redirect: null };
}
