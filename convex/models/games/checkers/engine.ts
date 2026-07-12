import type { Infer } from "convex/values";
import type { GameEngine, GameStatus } from "../engine.js";
import { computeLegalMoves, captureMovesFrom, idx, rc } from "./rules.js";
import { checkersMove, checkersState } from "./schema.js";
import type { PieceColor, Square } from "./rules.js";

export type CheckersState = Infer<typeof checkersState>;
export type CheckersMove = Infer<typeof checkersMove>;

function initialBoard(): Square[] {
	const board: Square[] = Array(64).fill(null);
	for (let row = 0; row < 8; row++) {
		for (let col = 0; col < 8; col++) {
			if ((row + col) % 2 !== 1) continue;
			if (row <= 2) board[idx(row, col)] = { color: "pink", king: false };
			else if (row >= 5) board[idx(row, col)] = { color: "cyan", king: false };
		}
	}
	return board;
}

function colorOf(playerIndex: number): PieceColor {
	return playerIndex === 0 ? "cyan" : "pink";
}

function createInitialState(): CheckersState {
	return { kind: "checkers", board: initialBoard(), turn: "cyan", mustContinueFrom: null };
}

function status(state: CheckersState): GameStatus {
	const turnIndex = state.turn === "cyan" ? 0 : 1;
	const legalMoves = computeLegalMoves(state.board, state.turn, state.mustContinueFrom);
	if (legalMoves.length === 0) {
		return { turnIndex, winnerIndex: turnIndex === 0 ? 1 : 0, isOver: true };
	}
	return { turnIndex, winnerIndex: null, isOver: false };
}

/** The match's winner once the side to move has no legal moves left; null while still in progress. */
function roundWinner(state: CheckersState): number | null {
	return status(state).winnerIndex;
}

function applyMove(state: CheckersState, playerIndex: number, move: CheckersMove): CheckersState {
	if (status(state).isOver) return state;

	const color = colorOf(playerIndex);
	if (color !== state.turn) throw new Error("Not your turn");

	const legalMoves = computeLegalMoves(state.board, state.turn, state.mustContinueFrom);
	const found = legalMoves.find((m) => m.from === move.from && m.to === move.to);
	if (!found) return state;

	const piece = state.board[found.from];
	if (!piece) return state;

	const board = state.board.slice();
	board[found.from] = null;
	if (found.captured !== null) board[found.captured] = null;

	const [toRow] = rc(found.to);
	const promotes =
		!piece.king &&
		((piece.color === "cyan" && toRow === 0) || (piece.color === "pink" && toRow === 7));
	board[found.to] = promotes ? { ...piece, king: true } : { ...piece };

	if (found.captured !== null && captureMovesFrom(board, found.to).length > 0) {
		return { ...state, board, mustContinueFrom: found.to };
	}

	return { ...state, board, turn: state.turn === "cyan" ? "pink" : "cyan", mustContinueFrom: null };
}

export const checkersEngine: GameEngine<CheckersState, CheckersMove> = {
	kind: "checkers",
	playerCount: 2,
	createInitialState,
	applyMove,
	status,
	roundWinner
};
