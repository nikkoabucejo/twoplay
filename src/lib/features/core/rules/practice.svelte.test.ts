import { describe, expect, test } from "vitest";
import { idx } from "../../../../../convex/models/games/checkers/rules.js";
import type { Square } from "../../../../../convex/models/games/checkers/rules.js";
import {
	positionKey,
	squareIndex,
	type Square as ChessSquare
} from "../../../../../convex/models/games/chess/rules.js";
import { CheckersPractice, ChessPractice, TictactoePractice } from "./practice.svelte.js";

const CYAN: Square = { color: "cyan", king: false };
const PINK: Square = { color: "pink", king: false };

function boardWith(pieces: [row: number, col: number, square: Square][]): Square[] {
	const board: Square[] = Array(64).fill(null);
	for (const [row, col, square] of pieces) board[idx(row, col)] = square;
	return board;
}

describe("TictactoePractice", () => {
	test("alternates seats and marks the last move", () => {
		const practice = new TictactoePractice();
		expect(practice.play(4, 4)).toBe(true);
		expect(practice.turn).toBe(1);
		expect(practice.lastMove).toEqual({ boardIndex: 4, cellIndex: 4, seat: 0 });
		expect(practice.state.boards[4][4]).toBe("X");
	});

	test("refuses your last board with the engine's reason", () => {
		const practice = new TictactoePractice();
		practice.play(4, 4);
		practice.play(0, 0);
		expect(practice.play(4, 0)).toBe(false);
		expect(practice.notice).toBe("You can't play the board you played last turn");
		expect(practice.state.boards[4][0]).toBeNull();
		practice.play(2, 2);
		expect(practice.notice).toBeNull();
	});

	test("allows your last board when it is the only open one", () => {
		const practice = new TictactoePractice();
		const full = ["X", "O", "X", "X", "O", "O", "O", "X", "X"] as const;
		practice.state = {
			kind: "tictactoe",
			boards: Array.from({ length: 9 }, (_, board) =>
				board === 4 ? Array(9).fill(null) : [...full]
			),
			lastBoardBySymbol: { X: 4, O: 0 }
		};
		expect(practice.play(4, 0)).toBe(true);
	});

	test("reset clears the board", () => {
		const practice = new TictactoePractice();
		practice.play(4, 4);
		practice.reset();
		expect(practice.state.boards.flat().every((cell) => cell === null)).toBe(true);
		expect(practice.lastMove).toBeNull();
	});
});

describe("CheckersPractice", () => {
	test("selecting a piece shows where it can move", () => {
		const practice = new CheckersPractice();
		practice.select(idx(5, 0));
		expect(practice.activePiece).toBe(idx(5, 0));
		expect(practice.destinations).toEqual([idx(4, 1)]);
	});

	test("moving hands the turn over and carries the piece's id", () => {
		const practice = new CheckersPractice();
		practice.select(idx(5, 0));
		expect(practice.select(idx(4, 1))).toBe(true);
		expect(practice.turn).toBe(1);
		expect(practice.ids[idx(4, 1)]).toBe(idx(5, 0));
		expect(practice.lastMove).toEqual({ from: idx(5, 0), to: idx(4, 1), seat: 0 });
	});

	test("a piece that can't capture is refused while a capture is open", () => {
		const practice = new CheckersPractice();
		practice.state = {
			kind: "checkers",
			board: boardWith([
				[5, 2, CYAN],
				[6, 5, CYAN],
				[4, 3, PINK]
			]),
			turn: "cyan",
			mustContinueFrom: null
		};
		expect(practice.forcedPieces).toEqual([idx(5, 2)]);
		practice.select(idx(6, 5));
		expect(practice.activePiece).toBeNull();
		expect(practice.notice).toBe("You have to capture");
	});

	test("a capturing piece keeps jumping in the same turn", () => {
		const practice = new CheckersPractice();
		const board = boardWith([
			[6, 1, CYAN],
			[5, 2, PINK],
			[3, 4, PINK],
			[1, 0, PINK]
		]);
		practice.state = { kind: "checkers", board, turn: "cyan", mustContinueFrom: null };
		practice.ids = board.map((square, index) => (square ? index : null));
		practice.select(idx(6, 1));
		practice.select(idx(4, 3));
		expect(practice.turn).toBe(0);
		expect(practice.activePiece).toBe(idx(4, 3));
		practice.select(idx(1, 0));
		expect(practice.notice).toBe("Keep jumping with the same piece");
		practice.select(idx(2, 5));
		expect(practice.turn).toBe(1);
		expect(practice.state.board[idx(3, 4)]).toBeNull();
	});

	test("the side with no legal move loses", () => {
		const practice = new CheckersPractice();
		practice.state = {
			kind: "checkers",
			board: boardWith([
				[5, 0, CYAN],
				[7, 0, CYAN],
				[7, 2, CYAN],
				[6, 1, PINK]
			]),
			turn: "pink",
			mustContinueFrom: null
		};
		expect(practice.result).toEqual({ winner: 0 });
	});
});

describe("ChessPractice", () => {
	function practiceAt(fen: string) {
		const practice = new ChessPractice();
		practice.state = { kind: "chess", fen, positions: [positionKey(fen)] };
		return practice;
	}

	function move(practice: ChessPractice, from: ChessSquare, to: ChessSquare) {
		practice.select(squareIndex(from));
		return practice.select(squareIndex(to));
	}

	const PROMOTING = "4k3/1P6/8/8/8/8/8/4K3 w - - 0 1";

	test("selecting a piece shows where it can move", () => {
		const practice = new ChessPractice();
		practice.select(squareIndex("g1"));
		expect(practice.selected).toBe("g1");
		expect(practice.destinations).toEqual(["f3", "h3"]);
	});

	test("both seats alternate and the last move is marked", () => {
		const practice = new ChessPractice();
		expect(move(practice, "e2", "e4")).toBe(true);
		expect(practice.turn).toBe(1);
		expect(practice.lastMove).toEqual({ from: "e2", to: "e4", seat: 0 });
		expect(move(practice, "e7", "e5")).toBe(true);
		expect(practice.turn).toBe(0);
		expect(practice.lastMove).toEqual({ from: "e7", to: "e5", seat: 1 });
	});

	test("an illegal move is refused with a notice, keeping the position and the selection", () => {
		const practice = new ChessPractice();
		const start = practice.state;
		expect(move(practice, "g1", "g3")).toBe(false);
		expect(practice.state).toBe(start);
		expect(practice.notice).toBe("That piece can't move there");
		expect(practice.selected).toBe("g1");
		expect(practice.select(squareIndex("f3"))).toBe(true);
		expect(practice.notice).toBeNull();
	});

	test("a piece with no legal move is refused with a notice", () => {
		const practice = new ChessPractice();
		practice.select(squareIndex("a1"));
		expect(practice.selected).toBeNull();
		expect(practice.notice).toBe("That piece can't move");
	});

	test("selecting the selected piece again drops it", () => {
		const practice = new ChessPractice();
		practice.select(squareIndex("g1"));
		practice.select(squareIndex("g1"));
		expect(practice.selected).toBeNull();
	});

	test("a pawn reaching the far row waits for the picker", () => {
		const practice = practiceAt(PROMOTING);
		expect(move(practice, "b7", "b8")).toBe(false);
		expect(practice.pendingPromotion).toEqual({ from: "b7", to: "b8" });
		expect(practice.turn).toBe(0);
		expect(practice.promote("n")).toBe(true);
		expect(practice.pendingPromotion).toBeNull();
		expect(practice.board[squareIndex("b8")]).toEqual({ color: "w", type: "n" });
		expect(practice.turn).toBe(1);
	});

	test("cancelling the picker leaves the pawn in place", () => {
		const practice = practiceAt(PROMOTING);
		move(practice, "b7", "b8");
		practice.cancelPromotion();
		expect(practice.pendingPromotion).toBeNull();
		expect(practice.board[squareIndex("b7")]).toEqual({ color: "w", type: "p" });
		expect(practice.turn).toBe(0);
	});

	test("checkmate ends the practice with a winner and marks the checked king", () => {
		const practice = new ChessPractice();
		move(practice, "f2", "f3");
		move(practice, "e7", "e5");
		move(practice, "g2", "g4");
		move(practice, "d8", "h4");
		expect(practice.checkSquare).toBe("e1");
		expect(practice.result).toEqual({ winner: 1 });
	});

	test("stalemate ends the practice as a draw", () => {
		const practice = practiceAt("7k/8/8/8/8/8/6Q1/K7 w - - 0 1");
		move(practice, "g2", "g6");
		expect(practice.result).toEqual({ winner: null });
	});

	test("reset goes back to the start", () => {
		const practice = new ChessPractice();
		move(practice, "e2", "e4");
		practice.reset();
		expect(practice.state.fen).toBe(new ChessPractice().state.fen);
		expect(practice.lastMove).toBeNull();
		expect(practice.selected).toBeNull();
	});
});
