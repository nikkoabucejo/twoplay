import { describe, expect, test } from "vitest";
import { checkersEngine } from "./engine.js";
import {
	captureMovesFrom,
	colorOfPlayer,
	computeLegalMoves,
	directionsFor,
	idx,
	inBounds,
	playerIndexOf,
	rc,
	simpleMovesFrom,
	type Move,
	type PieceColor,
	type Square
} from "./rules.js";

type Placement = [row: number, col: number, color: PieceColor, king?: boolean];

function boardWith(...pieces: Placement[]): Square[] {
	const board: Square[] = Array(64).fill(null);
	for (const [row, col, color, king = false] of pieces) board[idx(row, col)] = { color, king };
	return board;
}

/** Sorts moves so assertions don't depend on scan order. */
function sorted(moves: Move[]): Move[] {
	return [...moves].sort((a, b) => a.from - b.from || a.to - b.to);
}

function step(from: [number, number], to: [number, number]): Move {
	return { from: idx(...from), to: idx(...to), captured: null };
}

function jump(from: [number, number], over: [number, number], to: [number, number]): Move {
	return { from: idx(...from), to: idx(...to), captured: idx(...over) };
}

describe("colors", () => {
	test("player 0 plays cyan and player 1 plays pink", () => {
		expect(colorOfPlayer(0)).toBe("cyan");
		expect(colorOfPlayer(1)).toBe("pink");
	});

	test("cyan belongs to player 0 and pink to player 1", () => {
		expect(playerIndexOf("cyan")).toBe(0);
		expect(playerIndexOf("pink")).toBe(1);
	});
});

describe("coordinates", () => {
	test("idx and rc convert between row/col and a row-major index", () => {
		expect(idx(0, 0)).toBe(0);
		expect(idx(3, 5)).toBe(29);
		expect(idx(7, 7)).toBe(63);
		expect(rc(29)).toEqual([3, 5]);
		expect(rc(63)).toEqual([7, 7]);
	});

	test.each([
		[0, 0, true],
		[7, 7, true],
		[-1, 0, false],
		[0, -1, false],
		[8, 0, false],
		[0, 8, false]
	])("inBounds(%i, %i) is %s", (row, col, expected) => {
		expect(inBounds(row, col)).toBe(expected);
	});
});

describe("directionsFor", () => {
	test("a cyan man moves toward row 0", () => {
		expect(directionsFor({ color: "cyan", king: false })).toEqual([
			[-1, -1],
			[-1, 1]
		]);
	});

	test("a pink man moves toward row 7", () => {
		expect(directionsFor({ color: "pink", king: false })).toEqual([
			[1, -1],
			[1, 1]
		]);
	});

	test("a king moves in all four diagonal directions", () => {
		expect(directionsFor({ color: "pink", king: true })).toHaveLength(4);
		expect(directionsFor({ color: "cyan", king: true })).toEqual(
			expect.arrayContaining([
				[-1, -1],
				[-1, 1],
				[1, -1],
				[1, 1]
			])
		);
	});
});

describe("simpleMovesFrom", () => {
	test("an empty square has no moves", () => {
		expect(simpleMovesFrom(boardWith(), idx(4, 3))).toEqual([]);
	});

	test("a cyan man steps diagonally forward to either side", () => {
		const board = boardWith([4, 3, "cyan"]);
		expect(sorted(simpleMovesFrom(board, idx(4, 3)))).toEqual([
			step([4, 3], [3, 2]),
			step([4, 3], [3, 4])
		]);
	});

	test("a pink man steps diagonally toward row 7", () => {
		const board = boardWith([3, 2, "pink"]);
		expect(sorted(simpleMovesFrom(board, idx(3, 2)))).toEqual([
			step([3, 2], [4, 1]),
			step([3, 2], [4, 3])
		]);
	});

	test("a man on the edge column has only one step", () => {
		const board = boardWith([4, 7, "cyan"]);
		expect(simpleMovesFrom(board, idx(4, 7))).toEqual([step([4, 7], [3, 6])]);
	});

	test("a man cannot step onto an occupied square", () => {
		const board = boardWith([4, 3, "cyan"], [3, 2, "cyan"], [3, 4, "pink"]);
		expect(simpleMovesFrom(board, idx(4, 3))).toEqual([]);
	});

	test("a man on the far row has no forward steps", () => {
		const board = boardWith([0, 1, "cyan"]);
		expect(simpleMovesFrom(board, idx(0, 1))).toEqual([]);
	});

	test("a king steps in all four directions", () => {
		const board = boardWith([4, 3, "cyan", true]);
		expect(sorted(simpleMovesFrom(board, idx(4, 3)))).toEqual([
			step([4, 3], [3, 2]),
			step([4, 3], [3, 4]),
			step([4, 3], [5, 2]),
			step([4, 3], [5, 4])
		]);
	});
});

describe("captureMovesFrom", () => {
	test("a man jumps an adjacent opponent onto the empty square beyond", () => {
		const board = boardWith([5, 2, "cyan"], [4, 3, "pink"]);
		expect(captureMovesFrom(board, idx(5, 2))).toEqual([jump([5, 2], [4, 3], [3, 4])]);
	});

	test("a man cannot jump its own color", () => {
		const board = boardWith([5, 2, "cyan"], [4, 3, "cyan"]);
		expect(captureMovesFrom(board, idx(5, 2))).toEqual([]);
	});

	test("a man cannot jump when the landing square is occupied", () => {
		const board = boardWith([5, 2, "cyan"], [4, 3, "pink"], [3, 4, "pink"]);
		expect(captureMovesFrom(board, idx(5, 2))).toEqual([]);
	});

	test("a man cannot jump off the board", () => {
		const board = boardWith([1, 2, "cyan"], [0, 1, "pink"]);
		expect(captureMovesFrom(board, idx(1, 2))).toEqual([]);
	});

	test("a man cannot capture backwards", () => {
		const board = boardWith([3, 2, "cyan"], [4, 3, "pink"]);
		expect(captureMovesFrom(board, idx(3, 2))).toEqual([]);
	});

	test("a king captures backwards", () => {
		const board = boardWith([3, 2, "cyan", true], [4, 3, "pink"]);
		expect(captureMovesFrom(board, idx(3, 2))).toEqual([jump([3, 2], [4, 3], [5, 4])]);
	});

	test("a man lists every available capture", () => {
		const board = boardWith([5, 4, "cyan"], [4, 3, "pink"], [4, 5, "pink"]);
		expect(sorted(captureMovesFrom(board, idx(5, 4)))).toEqual([
			jump([5, 4], [4, 3], [3, 2]),
			jump([5, 4], [4, 5], [3, 6])
		]);
	});

	test("an empty square has no captures", () => {
		expect(captureMovesFrom(boardWith([4, 3, "pink"]), idx(5, 2))).toEqual([]);
	});
});

describe("computeLegalMoves", () => {
	const initial = checkersEngine.createInitialState().board;

	test("cyan has seven opening moves, all from its front row", () => {
		const moves = computeLegalMoves(initial, "cyan", null);
		expect(moves).toHaveLength(7);
		expect(moves.every((m) => rc(m.from)[0] === 5 && rc(m.to)[0] === 4)).toBe(true);
	});

	test("pink has seven opening moves, all from its front row", () => {
		const moves = computeLegalMoves(initial, "pink", null);
		expect(moves).toHaveLength(7);
		expect(moves.every((m) => rc(m.from)[0] === 2 && rc(m.to)[0] === 3)).toBe(true);
	});

	test("only the given color's pieces are moved", () => {
		const board = boardWith([5, 2, "cyan"], [2, 1, "pink"]);
		expect(computeLegalMoves(board, "pink", null).every((m) => m.from === idx(2, 1))).toBe(true);
	});

	test("a capture anywhere makes captures the only legal moves", () => {
		const board = boardWith([5, 2, "cyan"], [4, 3, "pink"], [6, 7, "cyan"]);
		expect(computeLegalMoves(board, "cyan", null)).toEqual([jump([5, 2], [4, 3], [3, 4])]);
	});

	test("every capturing piece's captures are offered", () => {
		const board = boardWith([5, 0, "cyan"], [4, 1, "pink"], [5, 6, "cyan"], [4, 5, "pink"]);
		expect(sorted(computeLegalMoves(board, "cyan", null))).toEqual([
			jump([5, 0], [4, 1], [3, 2]),
			jump([5, 6], [4, 5], [3, 4])
		]);
	});

	test("mid multi-jump only the jumping piece's captures are legal", () => {
		const board = boardWith([3, 2, "cyan"], [2, 3, "pink"], [5, 6, "cyan"], [4, 5, "pink"]);
		expect(computeLegalMoves(board, "cyan", idx(3, 2))).toEqual([jump([3, 2], [2, 3], [1, 4])]);
	});

	test("simple moves are legal when no capture exists", () => {
		const board = boardWith([5, 2, "cyan"]);
		expect(sorted(computeLegalMoves(board, "cyan", null))).toEqual([
			step([5, 2], [4, 1]),
			step([5, 2], [4, 3])
		]);
	});

	test("a color with no pieces has no legal moves", () => {
		expect(computeLegalMoves(boardWith([4, 3, "pink"]), "cyan", null)).toEqual([]);
	});

	test("a color whose pieces are all blocked has no legal moves", () => {
		const board = boardWith([6, 1, "cyan"], [5, 0, "pink"], [5, 2, "pink"], [4, 3, "pink"]);
		expect(computeLegalMoves(board, "cyan", null)).toEqual([]);
	});
});
