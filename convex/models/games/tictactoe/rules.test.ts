import { describe, expect, test } from "vitest";
import {
	WINNING_LINES,
	hasOtherPlayableBoard,
	isBoardFinished,
	markOf,
	metaWinnerOf,
	playerIndexOf,
	winnerOf,
	type Cell
} from "./rules.js";

/** Parses a 9-character board string ("X", "O", or "." for empty), row-major. */
function cells(layout: string): Cell[] {
	return [...layout].map((ch) => (ch === "." ? null : (ch as "X" | "O")));
}

const EMPTY = ".........";
const DRAWN = "XOXXOOOXX";
const WON_BY_X = "XXXOO....";
const WON_BY_O = "OOOXX....";

describe("marks", () => {
	test("player 0 plays X and player 1 plays O", () => {
		expect(markOf(0)).toBe("X");
		expect(markOf(1)).toBe("O");
	});

	test("X belongs to player 0 and O to player 1", () => {
		expect(playerIndexOf("X")).toBe(0);
		expect(playerIndexOf("O")).toBe(1);
	});
});

describe("winnerOf", () => {
	test.each(WINNING_LINES.map((line) => [line.join(","), line] as const))(
		"three X marks on line %s win the board",
		(_, line) => {
			const board = cells(EMPTY);
			for (const i of line) board[i] = "X";
			expect(winnerOf(board)).toBe("X");
		}
	);

	test("three O marks in a line win the board for O", () => {
		expect(winnerOf(cells("..O.O.O.."))).toBe("O");
	});

	test("an empty board has no winner", () => {
		expect(winnerOf(cells(EMPTY))).toBeNull();
	});

	test("a full board with no line has no winner", () => {
		expect(winnerOf(cells(DRAWN))).toBeNull();
	});

	test("a line mixing X and O is not a win", () => {
		expect(winnerOf(cells("XXO......"))).toBeNull();
	});
});

describe("isBoardFinished", () => {
	test("an empty board is not finished", () => {
		expect(isBoardFinished(cells(EMPTY))).toBe(false);
	});

	test("a partly filled board with no line is not finished", () => {
		expect(isBoardFinished(cells("XO......."))).toBe(false);
	});

	test("a won board is finished even with empty cells left", () => {
		expect(isBoardFinished(cells(WON_BY_X))).toBe(true);
	});

	test("a full board with no winner is finished", () => {
		expect(isBoardFinished(cells(DRAWN))).toBe(true);
	});
});

describe("hasOtherPlayableBoard", () => {
	test("is true when another board is still open", () => {
		const boards = [cells(EMPTY), cells(EMPTY)];
		expect(hasOtherPlayableBoard(boards, 0)).toBe(true);
	});

	test("is false when the excluded board is the only open one", () => {
		const boards = [cells(EMPTY), cells(WON_BY_O), cells(DRAWN)];
		expect(hasOtherPlayableBoard(boards, 0)).toBe(false);
	});

	test("is false when every board is finished", () => {
		const boards = [cells(WON_BY_X), cells(DRAWN)];
		expect(hasOtherPlayableBoard(boards, 0)).toBe(false);
	});
});

describe("metaWinnerOf", () => {
	function metaGrid(winners: string): Cell[][] {
		return [...winners].map((w) => cells(w === "X" ? WON_BY_X : w === "O" ? WON_BY_O : EMPTY));
	}

	test("winning three boards in a row wins the room", () => {
		expect(metaWinnerOf(metaGrid("XXX......"))).toBe("X");
	});

	test("winning three boards on a diagonal wins the room", () => {
		expect(metaWinnerOf(metaGrid("..O.O.O.."))).toBe("O");
	});

	test("boards won by different players do not complete a meta line", () => {
		expect(metaWinnerOf(metaGrid("XXO......"))).toBeNull();
	});

	test("a drawn board cannot complete a meta line", () => {
		const boards = metaGrid("XX.......");
		boards[2] = cells(DRAWN);
		expect(metaWinnerOf(boards)).toBeNull();
	});

	test("no boards won means no meta winner", () => {
		expect(metaWinnerOf(metaGrid(EMPTY))).toBeNull();
	});
});
