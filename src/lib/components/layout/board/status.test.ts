import { describe, expect, test } from "vitest";
import { roomStatus, type RoomStatusInput } from "./status.js";

const turnOfSeat1 = { turnIndex: 1, winnerIndex: null, isOver: false };

function input(overrides: Partial<RoomStatusInput> = {}): RoomStatusInput {
	return {
		isWaitingForOpponent: false,
		isRoomClosed: false,
		endedSeat: null,
		reason: null,
		live: turnOfSeat1,
		...overrides
	};
}

describe("roomStatus", () => {
	test("a room short a seat is waiting", () => {
		expect(roomStatus(input({ isWaitingForOpponent: true }))).toEqual({
			type: "waiting",
			closed: false
		});
	});

	test("a closed room that never filled is closed waiting", () => {
		expect(roomStatus(input({ isWaitingForOpponent: true, isRoomClosed: true }))).toEqual({
			type: "waiting",
			closed: true
		});
	});

	test.each(["timeout", "resign", "abandon"] as const)(
		"a round ended by %s goes to the other seat",
		(reason) => {
			expect(roomStatus(input({ endedSeat: 0, reason }))).toEqual({
				type: "winner",
				player: 1,
				reason
			});
		}
	);

	test("a live win goes to the winning seat", () => {
		const live = { turnIndex: 1, winnerIndex: 0, isOver: true };
		expect(roomStatus(input({ live }))).toEqual({ type: "winner", player: 0 });
	});

	test("a live round over with no winner is a draw", () => {
		const live = { turnIndex: 0, winnerIndex: null, isOver: true };
		expect(roomStatus(input({ live }))).toEqual({ type: "draw" });
	});

	test("a round in play is the live turn", () => {
		expect(roomStatus(input())).toEqual({ type: "turn", player: 1 });
	});

	test("no live outcome gives no status", () => {
		expect(roomStatus(input({ live: null }))).toBeUndefined();
	});
});
