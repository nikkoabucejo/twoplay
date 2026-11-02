import type { BoardStatus } from "./board.svelte";

export type RoomStatusInput = {
	isWaitingForOpponent: boolean;
	isRoomClosed: boolean;
	/** The seat whose round ended against them by timeout, resignation, or abandonment. */
	endedSeat: 0 | 1 | null;
	reason: "timeout" | "resign" | "abandon" | null;
	/** The live round's outcome, never the scrubbed one, so scrubbing can't change the status. */
	live: { turnIndex: number; winnerIndex: number | null; isOver: boolean } | null;
};

export function roomStatus({
	isWaitingForOpponent,
	isRoomClosed,
	endedSeat,
	reason,
	live
}: RoomStatusInput): BoardStatus | undefined {
	if (isWaitingForOpponent) return { type: "waiting", closed: isRoomClosed };
	if (endedSeat !== null) {
		return { type: "winner", player: endedSeat === 0 ? 1 : 0, reason: reason ?? undefined };
	}
	if (live === null) return undefined;
	if (live.winnerIndex !== null) return { type: "winner", player: live.winnerIndex as 0 | 1 };
	if (live.isOver) return { type: "draw" };
	return { type: "turn", player: live.turnIndex as 0 | 1 };
}
