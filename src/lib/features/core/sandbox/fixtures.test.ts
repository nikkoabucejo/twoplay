import { describe, expect, test } from "vitest";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import { computeLegalMoves, idx } from "../../../../../convex/models/games/checkers/rules.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
import {
	boardOf,
	isPromotion,
	outcome,
	squareIndex
} from "../../../../../convex/models/games/chess/rules.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import { winnerOf } from "../../../../../convex/models/games/tictactoe/rules.js";
import { CHECKERS, CHESS, PROMOTIONS, RESULTS, TICTACTOE } from "./fixtures.js";

describe("TICTACTOE", () => {
	test("board won has one board won by X and the game still going", () => {
		const { position } = TICTACTOE.boardWon;
		expect(position.boards.map(winnerOf).filter((mark) => mark !== null)).toEqual(["X"]);
		expect(tictactoeEngine.status(position).isOver).toBe(false);
	});

	test("game won is a meta-win for X", () => {
		const status = tictactoeEngine.status(TICTACTOE.gameWon.position);
		expect(status).toMatchObject({ isOver: true, winnerIndex: 0 });
	});

	test("draw finishes every board with no winner", () => {
		const status = tictactoeEngine.status(TICTACTOE.draw.position);
		expect(status).toMatchObject({ isOver: true, winnerIndex: null });
	});

	test("each last move is a mark on the board", () => {
		for (const { position, lastMove } of Object.values(TICTACTOE)) {
			expect(position.boards[lastMove.boardIndex][lastMove.cellIndex]).toBe(
				lastMove.seat === 0 ? "X" : "O"
			);
		}
	});
});

describe("CHECKERS", () => {
	test("the selected piece shows its legal destinations", () => {
		const { state, selected, destinations } = CHECKERS.selected;
		const legal = computeLegalMoves(state.board, state.turn, state.mustContinueFrom)
			.filter((move) => move.from === selected)
			.map((move) => move.to);
		expect(destinations).toEqual(legal);
		expect(destinations.length).toBeGreaterThan(0);
	});

	test("must capture rings the only pieces that can move, all capturing", () => {
		const { state, forced } = CHECKERS.mustCapture;
		const legal = computeLegalMoves(state.board, state.turn, state.mustContinueFrom);
		expect(legal.every((move) => move.captured !== null)).toBe(true);
		expect(forced).toEqual([...new Set(legal.map((move) => move.from))]);
		expect(forced).toEqual([idx(4, 3)]);
	});

	test("kings has a king for each seat and the selected king moves both ways", () => {
		const { state, selected, destinations } = CHECKERS.kings;
		const kings = state.board.filter((square) => square?.king).map((square) => square?.color);
		expect(new Set(kings)).toEqual(new Set(["cyan", "pink"]));
		expect(selected).toBe(idx(4, 3));
		expect(state.board[idx(4, 3)]).toEqual({ color: "cyan", king: true });
		expect(destinations).toHaveLength(4);
	});

	test("every preview is still in play", () => {
		for (const { state } of Object.values(CHECKERS)) {
			expect(checkersEngine.status(state).isOver).toBe(false);
		}
	});
});

describe("CHESS", () => {
	test("check marks the king to move", () => {
		const { state, checkSquare } = CHESS.check;
		expect(checkSquare).toBe("e8");
		expect(chessEngine.status(state).isOver).toBe(false);
	});

	test("checkmate is over, won by the side that moved last", () => {
		const { state, checkSquare, lastMove } = CHESS.checkmate;
		expect(outcome(state)).toBe("checkmate");
		expect(chessEngine.status(state).winnerIndex).toBe(lastMove?.seat);
		expect(checkSquare).toBe("e1");
	});

	test("the selected piece shows a move and a capture", () => {
		const { board, selected, destinations } = CHESS.selected;
		expect(selected).toBe("e4");
		expect([...destinations].sort()).toEqual(["d5", "e5"]);
		expect(board[squareIndex("d5")]).toMatchObject({ color: "b" });
	});

	test("each board matches its position", () => {
		for (const { state, board } of Object.values(CHESS)) {
			expect(board).toEqual(boardOf(state.fen));
		}
	});
});

describe("PROMOTIONS", () => {
	test.each(["w", "b"] as const)("the %s pawn's move needs a promotion piece", (color) => {
		const { fen, from, to } = PROMOTIONS[color];
		expect(isPromotion(fen, from, to)).toBe(true);
	});

	test.each(["w", "b"] as const)("the %s board shows the pawn on the last rank", (color) => {
		const { board, from, to } = PROMOTIONS[color];
		expect(board[squareIndex(to)]).toEqual({ color, type: "p" });
		expect(board[squareIndex(from)]).toBeNull();
		expect(to[1]).toBe(color === "w" ? "8" : "1");
	});
});

describe("RESULTS", () => {
	test("covers a win, a loss, a draw, and a timeout", () => {
		expect(RESULTS.map(({ view }) => [view.headline, view.tone, view.reason])).toEqual([
			["You won", "win", null],
			["You lost", "loss", null],
			["Draw", "draw", null],
			["You lost", "loss", "Out of time"]
		]);
	});
});
