import { describe, expect, test } from "vitest";
import { squareIndex, type Square } from "../../../../../convex/models/games/chess/rules.js";
import { rovingStep, scrubCommand } from "./keys.js";

describe("scrubCommand", () => {
	const outside = { isInBoard: false, isTextField: false };
	const inside = { isInBoard: true, isTextField: false };

	test.each([
		["ArrowLeft", "back"],
		["ArrowRight", "forward"],
		["ArrowDown", "first"],
		["ArrowUp", "live"],
		["[", "back"],
		["]", "forward"],
		["Enter", null]
	] as const)("%s outside the board scrubs %s", (key, command) => {
		expect(scrubCommand(key, outside)).toBe(command);
	});

	test.each(["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"])(
		"%s inside the board doesn't scrub",
		(key) => {
			expect(scrubCommand(key, inside)).toBeNull();
		}
	);

	test("brackets scrub inside the board", () => {
		expect(scrubCommand("[", inside)).toBe("back");
		expect(scrubCommand("]", inside)).toBe("forward");
	});

	test.each(["ArrowLeft", "["])("%s in a text field doesn't scrub", (key) => {
		expect(scrubCommand(key, { isInBoard: false, isTextField: true })).toBeNull();
	});
});

describe("rovingStep", () => {
	/** Tic-tac-toe slot of 1-based board and cell numbers. */
	const cell = (board: number, cell: number) => (board - 1) * 9 + (cell - 1);
	/** Checkers slot of a visual row and column. */
	const square = (row: number, col: number) => row * 8 + col;

	test("ArrowRight from board 1 cell 3 crosses to board 2 cell 1", () => {
		expect(rovingStep(cell(1, 3), "ArrowRight", "tictactoe")).toBe(cell(2, 1));
	});

	test("ArrowDown from board 1 cell 7 crosses to board 4 cell 1", () => {
		expect(rovingStep(cell(1, 7), "ArrowDown", "tictactoe")).toBe(cell(4, 1));
	});

	test("ArrowLeft inside a mini-board stays in it", () => {
		expect(rovingStep(cell(5, 2), "ArrowLeft", "tictactoe")).toBe(cell(5, 1));
	});

	test.each([
		[cell(1, 1), "ArrowLeft"],
		[cell(1, 1), "ArrowUp"],
		[cell(9, 9), "ArrowRight"],
		[cell(9, 9), "ArrowDown"]
	])("tic-tac-toe slot %i stops at the edge on %s", (slot, key) => {
		expect(rovingStep(slot, key, "tictactoe")).toBe(slot);
	});

	test("Home and End go to the first and last tic-tac-toe cell", () => {
		expect(rovingStep(cell(5, 5), "Home", "tictactoe")).toBe(cell(1, 1));
		expect(rovingStep(cell(5, 5), "End", "tictactoe")).toBe(cell(9, 9));
	});

	test("ArrowRight from a1 skips the light square to c1", () => {
		expect(rovingStep(square(7, 0), "ArrowRight", "checkers")).toBe(square(7, 2));
	});

	test("ArrowUp from the left edge goes up and right", () => {
		expect(rovingStep(square(7, 0), "ArrowUp", "checkers")).toBe(square(6, 1));
	});

	test("ArrowUp from the right edge goes up and left", () => {
		expect(rovingStep(square(6, 7), "ArrowUp", "checkers")).toBe(square(5, 6));
	});

	test("ArrowDown from the right edge goes down and left", () => {
		expect(rovingStep(square(0, 7), "ArrowDown", "checkers")).toBe(square(1, 6));
	});

	test.each([
		[square(7, 0), "ArrowLeft"],
		[square(7, 0), "ArrowDown"],
		[square(0, 7), "ArrowRight"],
		[square(0, 1), "ArrowUp"]
	])("checkers slot %i stops at the edge on %s", (slot, key) => {
		expect(rovingStep(slot, key, "checkers")).toBe(slot);
	});

	test("Home and End go to the first and last dark square", () => {
		expect(rovingStep(square(4, 3), "Home", "checkers")).toBe(square(0, 1));
		expect(rovingStep(square(4, 3), "End", "checkers")).toBe(square(7, 6));
	});

	test.each([
		[square(4, 3), "ArrowRight", square(4, 4)],
		[square(4, 3), "ArrowLeft", square(4, 2)],
		[square(4, 3), "ArrowUp", square(3, 3)],
		[square(4, 3), "ArrowDown", square(5, 3)]
	])("chess slot %i steps on %s to %i", (slot, key, next) => {
		expect(rovingStep(slot, key, "chess")).toBe(next);
	});

	test.each([
		[square(7, 0), "ArrowLeft"],
		[square(7, 0), "ArrowDown"],
		[square(0, 7), "ArrowRight"],
		[square(0, 7), "ArrowUp"]
	])("chess slot %i stops at the edge on %s", (slot, key) => {
		expect(rovingStep(slot, key, "chess")).toBe(slot);
	});

	test("Home and End go to the first and last chess square", () => {
		expect(rovingStep(square(4, 3), "Home", "chess")).toBe(0);
		expect(rovingStep(square(4, 3), "End", "chess")).toBe(63);
	});

	test("chess steps follow the board as drawn for black", () => {
		const slot = (name: Square) => 63 - squareIndex(name);
		expect(rovingStep(slot("e2"), "ArrowRight", "chess")).toBe(slot("d2"));
		expect(rovingStep(slot("d2"), "ArrowUp", "chess")).toBe(slot("d1"));
	});

	test("other keys don't move focus", () => {
		expect(rovingStep(cell(1, 1), "Enter", "tictactoe")).toBeNull();
		expect(rovingStep(square(7, 0), "[", "checkers")).toBeNull();
	});
});
