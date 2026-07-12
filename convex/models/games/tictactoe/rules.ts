import type { Infer } from "convex/values";
import type { tictactoeState } from "./schema.js";

export type Cell = Infer<typeof tictactoeState>["boards"][number][number];

export const WINNING_LINES: readonly (readonly [number, number, number])[] = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6]
];

export function winnerOf(board: readonly Cell[]): Cell {
	for (const [a, b, c] of WINNING_LINES) {
		if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) return board[a];
	}
	return null;
}

export function isBoardFinished(board: readonly Cell[]): boolean {
	return winnerOf(board) !== null || board.every((cell) => cell !== null);
}

export function hasOtherPlayableBoard(boards: readonly (readonly Cell[])[], excludeIndex: number) {
	return boards.some((b, i) => i !== excludeIndex && !isBoardFinished(b));
}

/**
 * Treats the nine boards' individual winners as a meta 3x3 grid and checks it with the same
 * line logic as a single board — winning three boards in a row/column/diagonal wins the room.
 * A drawn board contributes null, same as an empty cell, so it can't complete a meta line.
 */
export function metaWinnerOf(boards: readonly (readonly Cell[])[]): Cell {
	return winnerOf(boards.map(winnerOf));
}
