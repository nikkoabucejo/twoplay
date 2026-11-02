import { describe, expect, test } from "vitest";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
import { boardOf, outcome, squareIndex } from "../../../../../convex/models/games/chess/rules.js";
import type { Square } from "../../../../../convex/models/games/chess/rules.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import { RULES } from "./rules.js";
import type { BoardDemo } from "./rules.js";

function tictactoeDemo(heading: string) {
	const demo = RULES.tictactoe.steps.find((step) => step.heading === heading)?.demo;
	if (demo?.kind !== "tictactoe") throw new Error(`No tic-tac-toe demo for ${heading}`);
	return demo;
}

function checkersDemo(heading: string) {
	const demo = RULES.checkers.steps.find((step) => step.heading === heading)?.demo;
	if (demo?.kind !== "checkers") throw new Error(`No checkers demo for ${heading}`);
	return demo;
}

function chessDemo(heading: string) {
	const demo = RULES.chess.steps.find((step) => step.heading === heading)?.demo;
	if (demo?.kind !== "chess") throw new Error(`No chess demo for ${heading}`);
	return demo;
}

/** The piece on `square` after a chess demo's last move. */
function pieceAt(heading: string, square: Square) {
	const last = chessDemo(heading).steps.at(-1)?.state;
	if (!last) throw new Error(`No moves in ${heading}`);
	return boardOf(last.fen)[squareIndex(square)];
}

function rejections(demo: BoardDemo) {
	return demo.steps.map((step) => step.rejection);
}

describe("RULES", () => {
	test("the switch-boards demo is refused by the engine for each player's last board", () => {
		const reason = "You can't play the board you played last turn";
		expect(rejections(tictactoeDemo("Switch boards"))).toEqual([reason, null, reason, null]);
	});

	test("the tic-tac-toe win demos end the way the engine scores them", () => {
		const board = tictactoeDemo("Win a board");
		expect(board.steps.at(-1)?.state.boards[0].slice(0, 3)).toEqual(["X", "X", "X"]);
		const game = tictactoeDemo("Win the game");
		const last = game.steps.at(-1)?.state;
		expect(last && tictactoeEngine.status(last)).toMatchObject({ isOver: true, winnerIndex: 0 });
	});

	test("the capturing demo refuses a quiet move while a capture is open", () => {
		expect(rejections(checkersDemo("Capturing"))).toEqual([
			"If you can capture, you must",
			null,
			null
		]);
	});

	test("the multi-jump demo jumps twice in one turn", () => {
		const demo = checkersDemo("Multi-jumps");
		expect(demo.steps.map((step) => step.seat)).toEqual([0, 0, 1]);
		expect(rejections(demo)).toEqual([null, null, null]);
	});

	test("the crowning demo crowns the piece and keeps it jumping", () => {
		const demo = checkersDemo("Crowning");
		expect(rejections(demo)).toEqual([null, null, null]);
		expect(demo.steps[0].state.board[3]).toEqual({ color: "cyan", king: true });
		expect(demo.steps[1].seat).toBe(0);
	});

	test("the winning demo leaves the other side with no legal move", () => {
		const last = checkersDemo("Winning").steps.at(-1)?.state;
		expect(last && checkersEngine.status(last)).toMatchObject({ isOver: true, winnerIndex: 0 });
		expect(last?.board.some((square) => square?.color === "pink")).toBe(true);
	});

	test("every other demo move is legal", () => {
		for (const demo of [tictactoeDemo("Nine boards"), checkersDemo("Moving")]) {
			expect(rejections(demo).every((rejection) => rejection === null)).toBe(true);
		}
	});

	test("the chess steps cover piece moves, check, castling, en passant, promotion, draws, and clocks", () => {
		expect(RULES.chess.steps.map((step) => step.heading)).toEqual([
			"Moving",
			"Check and checkmate",
			"Castling",
			"En passant",
			"Promotion",
			"Draws",
			"Clocks"
		]);
		expect(RULES.chess.steps.at(-1)?.demo.kind).toBe("clocks");
	});

	test("the chess moving step names every piece", () => {
		const body = RULES.chess.steps[0].body.toLowerCase();
		for (const piece of ["pawns", "knights", "bishops", "rooks", "queens", "king"]) {
			expect(body).toContain(piece);
		}
	});

	test("the draws step names all four automatic draws", () => {
		const body = RULES.chess.steps.find((step) => step.heading === "Draws")?.body;
		expect(body).toMatch(/stalemate/);
		expect(body).toMatch(/enough pieces to checkmate/);
		expect(body).toMatch(/three times/);
		expect(body).toMatch(/fifty moves/);
	});

	test("every chess demo move is legal", () => {
		for (const step of RULES.chess.steps) {
			if (step.demo.kind !== "chess") continue;
			expect(rejections(step.demo).every((rejection) => rejection === null)).toBe(true);
		}
	});

	test("the checkmate demo ends with Player 2 winning", () => {
		const last = chessDemo("Check and checkmate").steps.at(-1)?.state;
		expect(last && chessEngine.status(last)).toMatchObject({ isOver: true, winnerIndex: 1 });
	});

	test("the castling demo moves each king two squares with its rook over it", () => {
		expect(pieceAt("Castling", "g1")).toEqual({ color: "w", type: "k" });
		expect(pieceAt("Castling", "f1")).toEqual({ color: "w", type: "r" });
		expect(pieceAt("Castling", "c8")).toEqual({ color: "b", type: "k" });
		expect(pieceAt("Castling", "d8")).toEqual({ color: "b", type: "r" });
	});

	test("the en passant demo takes the pawn that moved two squares", () => {
		expect(pieceAt("En passant", "d6")).toEqual({ color: "w", type: "p" });
		expect(pieceAt("En passant", "d5")).toBeNull();
	});

	test("the promotion demo turns the pawn into a queen", () => {
		const demo = chessDemo("Promotion");
		const first = demo.steps[0].state;
		expect(boardOf(first.fen)[squareIndex("b8")]).toEqual({ color: "w", type: "q" });
	});

	test("the draws demo ends in stalemate with no winner", () => {
		const last = chessDemo("Draws").steps.at(-1)?.state;
		expect(last && outcome(last)).toBe("stalemate");
		expect(last && chessEngine.status(last)).toMatchObject({ isOver: true, winnerIndex: null });
	});

	test("the chess preview is one of its steps", () => {
		expect(RULES.chess.steps.map((step) => step.demo)).toContain(RULES.chess.preview);
	});
});
