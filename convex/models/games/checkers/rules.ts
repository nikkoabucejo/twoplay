import type { Infer } from "convex/values";
import type { checkersState } from "./schema.js";

export type Square = Infer<typeof checkersState>["board"][number];
export type Piece = NonNullable<Square>;
export type PieceColor = Piece["color"];
export type Move = { from: number; to: number; captured: number | null };

export const SIZE = 8;

const KING_DIRECTIONS: readonly [number, number][] = [
	[-1, -1],
	[-1, 1],
	[1, -1],
	[1, 1]
];

export function idx(row: number, col: number): number {
	return row * SIZE + col;
}

export function rc(index: number): [number, number] {
	return [Math.floor(index / SIZE), index % SIZE];
}

export function inBounds(row: number, col: number): boolean {
	return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

export function directionsFor(piece: Piece): readonly [number, number][] {
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

export function simpleMovesFrom(board: readonly Square[], index: number): Move[] {
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

export function captureMovesFrom(board: readonly Square[], index: number): Move[] {
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
export function computeLegalMoves(
	board: readonly Square[],
	color: PieceColor,
	mustContinueFrom: number | null
): Move[] {
	if (mustContinueFrom !== null) return captureMovesFrom(board, mustContinueFrom);

	const indices: number[] = [];
	board.forEach((piece, i) => {
		if (piece && piece.color === color) indices.push(i);
	});

	const captures = indices.flatMap((i) => captureMovesFrom(board, i));
	if (captures.length > 0) return captures;

	return indices.flatMap((i) => simpleMovesFrom(board, i));
}
