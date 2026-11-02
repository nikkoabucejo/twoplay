import type { GameType } from "../../../../../convex/models/games/index.js";

type ActiveRoomState = {
	room: { code: string; type: GameType } | null | undefined;
	createdCode: string | null;
	isCreating: boolean;
};

/** Convex applies a mutation's query updates before its promise resolves, so `room` shows the new
 *  room while `create` is still awaited and `createdCode` is unset; `isCreating` covers that gap. */
export function activeRoomRedirect({
	room,
	createdCode,
	isCreating
}: ActiveRoomState): string | null {
	if (!room || createdCode || isCreating) return null;
	return `/${room.type}/${room.code}`;
}
