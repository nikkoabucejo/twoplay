import { describe, expect, test } from "vitest";
import type { RoomHistoryEntry } from "../../../../../convex/models/rooms/index.js";
import {
	formatRatingChange,
	groupByDay,
	reasonLabel,
	toRounds,
	type HistoryRound
} from "./rounds.js";

const BOB_ROOM: RoomHistoryEntry = {
	code: "WXYZ",
	type: "tictactoe",
	status: "closed",
	opponentName: "Bob Baker",
	games: [
		{ round: 2, createdAt: 30, result: "win", mmr: 8 },
		{ round: 1, createdAt: 10, result: "loss", mmr: -8 }
	]
};

const CY_ROOM: RoomHistoryEntry = {
	code: "QRST",
	type: "checkers",
	status: "closed",
	opponentName: null,
	games: [{ round: 1, createdAt: 20, result: "draw", mmr: null }]
};

function roundAt(createdAt: number): HistoryRound {
	return {
		code: "WXYZ",
		type: "tictactoe",
		opponentName: "Bob Baker",
		round: 1,
		createdAt,
		result: "win",
		mmr: 8,
		reason: null
	};
}

describe("toRounds", () => {
	test("gives one entry per round across rooms, newest first", () => {
		expect(toRounds([BOB_ROOM, CY_ROOM]).map((round) => [round.code, round.round])).toEqual([
			["WXYZ", 2],
			["QRST", 1],
			["WXYZ", 1]
		]);
	});

	test("carries the room's code, game, and opponent onto each round", () => {
		expect(toRounds([CY_ROOM])).toEqual([
			{
				code: "QRST",
				type: "checkers",
				opponentName: null,
				round: 1,
				createdAt: 20,
				result: "draw",
				mmr: null,
				reason: null
			}
		]);
	});

	test("an entry without a reason field gives a null reason", () => {
		expect(toRounds([BOB_ROOM]).map((round) => round.reason)).toEqual([null, null]);
	});

	test("keeps the entry's reason when it has one", () => {
		const room = {
			...CY_ROOM,
			games: [
				{ round: 1, createdAt: 20, result: "loss" as const, mmr: -8, reason: "timeout" as const }
			]
		};
		expect(toRounds([room])[0].reason).toBe("timeout");
	});

	test("gives nothing for no rooms", () => {
		expect(toRounds([])).toEqual([]);
	});
});

describe("reasonLabel", () => {
	test.each([
		["timeout", "Timeout"],
		["resign", "Resigned"],
		["abandon", "Abandoned"]
	] as const)("labels %s as %s", (reason, label) => {
		expect(reasonLabel(reason)).toBe(label);
	});

	test("gives null for no reason", () => {
		expect(reasonLabel(null)).toBeNull();
	});
});

describe("groupByDay", () => {
	const now = new Date(2026, 9, 30, 15, 0).getTime();

	test("labels today's and yesterday's rounds by name, keeping their order", () => {
		const rounds = [
			roundAt(new Date(2026, 9, 30, 9, 0).getTime()),
			roundAt(new Date(2026, 9, 29, 23, 0).getTime()),
			roundAt(new Date(2026, 9, 29, 0, 30).getTime())
		];
		expect(groupByDay(rounds, now)).toEqual([
			{ label: "Today", rounds: [rounds[0]] },
			{ label: "Yesterday", rounds: [rounds[1], rounds[2]] }
		]);
	});

	test("labels an earlier day this year by month and day", () => {
		const rounds = [roundAt(new Date(2026, 9, 28, 12, 0).getTime())];
		expect(groupByDay(rounds, now).map((group) => group.label)).toEqual(["Oct 28"]);
	});

	test("adds the year to a day from another year", () => {
		const rounds = [roundAt(new Date(2025, 9, 28, 12, 0).getTime())];
		expect(groupByDay(rounds, now).map((group) => group.label)).toEqual(["Oct 28, 2025"]);
	});

	test("gives no groups for no rounds", () => {
		expect(groupByDay([], now)).toEqual([]);
	});
});

describe("formatRatingChange", () => {
	test("signs a gain with a plus", () => {
		expect(formatRatingChange(8)).toBe("+8");
	});

	test("signs a loss with a minus sign", () => {
		expect(formatRatingChange(-8)).toBe("−8");
	});

	test("shows no change as 0 with no sign", () => {
		expect(formatRatingChange(0)).toBe("0");
	});

	test("gives null while there is no change yet", () => {
		expect(formatRatingChange(null)).toBeNull();
	});
});
