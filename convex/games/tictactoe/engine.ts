import type { Infer } from "convex/values";
import type { GameEngine, GameStatus } from "../engine.js";
import { tictactoeMove, tictactoeState } from "./schema.js";

export type TictactoeState = Infer<typeof tictactoeState>;
export type TictactoeMove = Infer<typeof tictactoeMove>;
type Cell = TictactoeState["boards"][number][number];

const BOARD_COUNT = 9;
const CELLS_PER_BOARD = 9;

const WINNING_LINES: readonly (readonly [number, number, number])[] = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6]
];

function winnerOf(board: Cell[]): Cell {
	for (const [a, b, c] of WINNING_LINES) {
		if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) return board[a];
	}
	return null;
}

function isBoardFinished(board: Cell[]): boolean {
	return winnerOf(board) !== null || board.every((cell) => cell !== null);
}

function hasOtherPlayableBoard(boards: Cell[][], excludeIndex: number): boolean {
	return boards.some((b, i) => i !== excludeIndex && !isBoardFinished(b));
}

function roleLabel(index: number): "X" | "O" {
	return index === 0 ? "X" : "O";
}

function createInitialState(): TictactoeState {
	return {
		kind: "tictactoe",
		boards: Array.from({ length: BOARD_COUNT }, () => Array<Cell>(CELLS_PER_BOARD).fill(null))
	};
}

function status(state: TictactoeState): GameStatus {
	const totalFilled = state.boards.reduce(
		(sum, board) => sum + board.filter((cell) => cell !== null).length,
		0
	);
	// This variant (nine independent boards, no meta-board) has no overall end condition today.
	return { turnIndex: totalFilled % 2 === 0 ? 0 : 1, winnerIndex: null, isOver: false };
}

function applyMove(
	state: TictactoeState,
	playerIndex: number,
	move: TictactoeMove
): TictactoeState {
	const symbol = roleLabel(playerIndex);
	const board = state.boards[move.boardIndex];
	if (!board || isBoardFinished(board) || board[move.cellIndex] !== null) return state;

	if (playerIndex !== status(state).turnIndex) throw new Error("Not your turn");

	const lastBoardBySymbol = state.lastBoardBySymbol ?? { X: null, O: null };
	if (
		lastBoardBySymbol[symbol] === move.boardIndex &&
		hasOtherPlayableBoard(state.boards, move.boardIndex)
	) {
		throw new Error("You can't play the board you played last turn");
	}

	const boards = state.boards.map((b, i) =>
		i === move.boardIndex ? b.map((c, j) => (j === move.cellIndex ? symbol : c)) : b
	);

	return {
		...state,
		boards,
		lastBoardBySymbol: { ...lastBoardBySymbol, [symbol]: move.boardIndex }
	};
}

export const tictactoeEngine: GameEngine<TictactoeState, TictactoeMove> = {
	kind: "tictactoe",
	playerCount: 2,
	createInitialState,
	applyMove,
	status,
	roleLabel
};
