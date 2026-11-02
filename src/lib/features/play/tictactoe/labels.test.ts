import { describe, expect, test } from "vitest";
import { BOARD_POSITIONS, boardLabel, cellLabel } from "./labels.js";

describe("BOARD_POSITIONS", () => {
	test("names the nine boards row by row", () => {
		expect(BOARD_POSITIONS[0]).toBe("top left");
		expect(BOARD_POSITIONS[4]).toBe("center");
		expect(BOARD_POSITIONS[8]).toBe("bottom right");
	});
});

describe("boardLabel", () => {
	test("is the 1-based number and position", () => {
		expect(boardLabel(0)).toBe("Board 1 (top left)");
		expect(boardLabel(8)).toBe("Board 9 (bottom right)");
	});
});

describe("cellLabel", () => {
	test("an empty cell the viewer may play now is playable", () => {
		expect(cellLabel(4, 2, null, true)).toBe("Board 5 (center), cell 3 — empty, playable");
	});

	test("an empty cell the viewer can't play is empty", () => {
		expect(cellLabel(4, 2, null, false)).toBe("Board 5 (center), cell 3 — empty");
	});

	test("a taken cell names its mark", () => {
		expect(cellLabel(0, 0, "O", false)).toBe("Board 1 (top left), cell 1 — O");
	});
});
