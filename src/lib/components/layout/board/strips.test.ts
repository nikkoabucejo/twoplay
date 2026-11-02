import { describe, expect, test } from "vitest";
import type { BoardStatus } from "./board.svelte";
import { stripLine, stripSeats, type StripLine } from "./strips.js";

describe("stripSeats", () => {
	test.each([
		{ myIndex: 0, expected: { top: 1, bottom: 0 } },
		{ myIndex: 1, expected: { top: 0, bottom: 1 } },
		{ myIndex: null, expected: { top: 1, bottom: 0 } }
	] as const)("viewer in $myIndex", ({ myIndex, expected }) => {
		expect(stripSeats(myIndex)).toEqual(expected);
	});
});

describe("stripLine", () => {
	const cases: [string, BoardStatus, 0 | 1, 0 | 1 | null, StripLine][] = [
		["viewer's turn on the viewer's seat", { type: "turn", player: 0 }, 0, 0, "your-turn"],
		["viewer's turn on the other seat", { type: "turn", player: 0 }, 1, 0, "score"],
		["opponent's turn on the opponent's seat", { type: "turn", player: 1 }, 1, 0, "to-move"],
		["opponent's turn on the viewer's seat", { type: "turn", player: 1 }, 0, 0, "score"],
		["spectator, turn seat", { type: "turn", player: 1 }, 1, null, "to-move"],
		["spectator, other seat", { type: "turn", player: 1 }, 0, null, "score"],
		["winner's seat", { type: "winner", player: 1 }, 1, 0, "won"],
		["loser's seat", { type: "winner", player: 1 }, 0, 0, "lost"],
		["spectator, winner's seat", { type: "winner", player: 0, reason: "resign" }, 0, null, "won"],
		["draw, seat 0", { type: "draw" }, 0, 0, "draw"],
		["draw, seat 1", { type: "draw" }, 1, null, "draw"],
		["waiting, seat 1", { type: "waiting" }, 1, 0, "waiting"],
		["waiting, seat 0", { type: "waiting" }, 0, 0, "score"],
		["closed waiting, seat 1", { type: "waiting", closed: true }, 1, 0, "blank"],
		["closed waiting, seat 0", { type: "waiting", closed: true }, 0, 0, "score"]
	];

	test.each(cases)("%s", (_, status, seat, myIndex, expected) => {
		expect(stripLine(status, seat, myIndex)).toBe(expected);
	});

	test("a forced capture on the viewer's turn reads must-capture on the viewer's strip", () => {
		expect(stripLine({ type: "turn", player: 0 }, 0, 0, true)).toBe("must-capture");
	});

	test("a forced capture leaves the opponent's strip on its score", () => {
		expect(stripLine({ type: "turn", player: 0 }, 1, 0, true)).toBe("score");
	});

	test("a forced capture on the opponent's turn reads to-move", () => {
		expect(stripLine({ type: "turn", player: 1 }, 1, 0, true)).toBe("to-move");
	});

	test("a spectator sees to-move on a forced capture", () => {
		expect(stripLine({ type: "turn", player: 0 }, 0, null, true)).toBe("to-move");
	});

	test("a quiet player's strip reads reconnecting during play", () => {
		expect(stripLine({ type: "turn", player: 1 }, 1, 0, false, true)).toBe("reconnecting");
		expect(stripLine({ type: "turn", player: 0 }, 1, 0, false, true)).toBe("reconnecting");
	});

	test("a finished round keeps its result over reconnecting", () => {
		expect(stripLine({ type: "winner", player: 0 }, 1, 0, false, true)).toBe("lost");
	});
});
