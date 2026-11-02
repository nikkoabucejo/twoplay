import { describe, expect, test } from "vitest";
import { chessEngine, type ChessMove, type ChessState } from "./engine.js";
import { INITIAL_FEN, positionKey } from "./rules.js";

const { applyMove, createInitialState, roundWinner, status } = chessEngine;

const STALEMATE_FEN = "7k/5Q2/6K1/8/8/8/8/8 b - - 1 1";
const STALEMATE: ChessState = {
	kind: "chess",
	fen: STALEMATE_FEN,
	positions: [positionKey(STALEMATE_FEN)]
};

function move(from: string, to: string): ChessMove {
	return { kind: "chess", from, to };
}

/** Plays alternating seats from seat 0, as the moves are given. */
function played(...moves: [from: string, to: string][]): ChessState {
	return moves.reduce(
		(state, [from, to], ply) => applyMove(state, ply % 2, move(from, to)),
		createInitialState()
	);
}

const foolsMate = () => played(["f2", "f3"], ["e7", "e5"], ["g2", "g4"], ["d8", "h4"]);

describe("engine metadata", () => {
	test("is a two-player chess engine", () => {
		expect(chessEngine.kind).toBe("chess");
		expect(chessEngine.playerCount).toBe(2);
	});
});

describe("createInitialState", () => {
	test("is the standard start with its key in the history", () => {
		expect(createInitialState()).toEqual({
			kind: "chess",
			fen: INITIAL_FEN,
			positions: [positionKey(INITIAL_FEN)]
		});
	});

	test("white moves first: seat 0 is to move", () => {
		expect(status(createInitialState())).toEqual({
			turnIndex: 0,
			winnerIndex: null,
			isOver: false
		});
	});
});

describe("applyMove", () => {
	test("a legal move passes the turn to seat 1", () => {
		const next = applyMove(createInitialState(), 0, move("e2", "e4"));
		expect(status(next).turnIndex).toBe(1);
	});

	test("a move out of turn throws", () => {
		expect(() => applyMove(createInitialState(), 1, move("e7", "e5"))).toThrow("Not your turn");
	});

	test("an illegal move returns the same state", () => {
		const state = createInitialState();
		expect(applyMove(state, 0, move("e2", "e5"))).toBe(state);
	});

	test("a move after the round is over returns the same state", () => {
		const state = foolsMate();
		expect(applyMove(state, 0, move("e1", "f2"))).toBe(state);
	});
});

describe("status", () => {
	test("fool's mate is over and seat 1 wins", () => {
		expect(status(foolsMate())).toEqual({ turnIndex: 0, winnerIndex: 1, isOver: true });
	});

	test("stalemate is over with no winner", () => {
		expect(status(STALEMATE)).toEqual({ turnIndex: 1, winnerIndex: null, isOver: true });
	});
});

describe("roundWinner", () => {
	test("is seat 1 after fool's mate", () => {
		expect(roundWinner(foolsMate())).toBe(1);
	});

	test("is null for a stalemate", () => {
		expect(roundWinner(STALEMATE)).toBeNull();
	});

	test("is null while the round goes on", () => {
		expect(roundWinner(createInitialState())).toBeNull();
	});
});
