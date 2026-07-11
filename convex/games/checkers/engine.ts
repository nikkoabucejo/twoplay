import type { Infer } from "convex/values";
import type { GameEngine, GameStatus } from "../engine.js";
import { checkersMove, checkersState } from "./schema.js";

export type CheckersState = Infer<typeof checkersState>;
export type CheckersMove = Infer<typeof checkersMove>;
type Square = CheckersState["board"][number];
type Piece = NonNullable<Square>;
type PieceColor = Piece["color"];

const SIZE = 8;
const KING_DIRECTIONS: readonly [number, number][] = [
	[-1, -1],
	[-1, 1],
	[1, -1],
	[1, 1]
];

function idx(row: number, col: number): number {
	return row * SIZE + col;
}

function rc(index: number): [number, number] {
	return [Math.floor(index / SIZE), index % SIZE];
}

function inBounds(row: number, col: number): boolean {
	return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function initialBoard(): Square[] {
	const board: Square[] = Array(SIZE * SIZE).fill(null);
	for (let row = 0; row < SIZE; row++) {
		for (let col = 0; col < SIZE; col++) {
			if ((row + col) % 2 !== 1) continue;
			if (row <= 2) board[idx(row, col)] = { color: "pink", king: false };
			else if (row >= 5) board[idx(row, col)] = { color: "cyan", king: false };
		}
	}
	return board;
}

function directionsFor(piece: Piece): readonly [number, number][] {
	if (piece.king) return KING_DIRECTIONS;
	return piece.color === "cyan"
		? [
				[-1, -1],
				[-1, 1]
			]
		: [
				[1, -1],
				[1, 1]
			];
}

type Move = { from: number; to: number; captured: number | null };

function simpleMovesFrom(board: Square[], index: number): Move[] {
	const piece = board[index];
	if (!piece) return [];
	const [row, col] = rc(index);
	const moves: Move[] = [];
	for (const [dr, dc] of directionsFor(piece)) {
		const toRow = row + dr;
		const toCol = col + dc;
		if (!inBounds(toRow, toCol)) continue;
		if (board[idx(toRow, toCol)] === null) {
			moves.push({ from: index, to: idx(toRow, toCol), captured: null });
		}
	}
	return moves;
}

function captureMovesFrom(board: Square[], index: number): Move[] {
	const piece = board[index];
	if (!piece) return [];
	const [row, col] = rc(index);
	const moves: Move[] = [];
	for (const [dr, dc] of directionsFor(piece)) {
		const midRow = row + dr;
		const midCol = col + dc;
		const landRow = row + dr * 2;
		const landCol = col + dc * 2;
		if (!inBounds(landRow, landCol)) continue;
		const midPiece = board[idx(midRow, midCol)];
		if (midPiece && midPiece.color !== piece.color && board[idx(landRow, landCol)] === null) {
			moves.push({ from: index, to: idx(landRow, landCol), captured: idx(midRow, midCol) });
		}
	}
	return moves;
}

/** Mandatory-capture rule: if any of the color's pieces can capture, only capture moves are legal. */
function computeLegalMoves(board: Square[], color: PieceColor, mustContinueFrom: number | null): Move[] {
	if (mustContinueFrom !== null) return captureMovesFrom(board, mustContinueFrom);

	const indices: number[] = [];
	board.forEach((piece, i) => {
		if (piece && piece.color === color) indices.push(i);
	});

	const captures = indices.flatMap((i) => captureMovesFrom(board, i));
	if (captures.length > 0) return captures;

	return indices.flatMap((i) => simpleMovesFrom(board, i));
}

function colorOf(playerIndex: number): PieceColor {
	return playerIndex === 0 ? "cyan" : "pink";
}

function roleLabel(index: number): "Cyan" | "Pink" {
	return index === 0 ? "Cyan" : "Pink";
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

function applyMove(state: CheckersState, playerIndex: number, move: CheckersMove): CheckersState {
	const color = colorOf(playerIndex);
	if (color !== state.turn) throw new Error("Not your turn");
	if (status(state).isOver) return state;

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
		!piece.king && ((piece.color === "cyan" && toRow === 0) || (piece.color === "pink" && toRow === 7));
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
	roleLabel
};
