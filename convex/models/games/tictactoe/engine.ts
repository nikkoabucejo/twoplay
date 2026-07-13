import type { Infer } from "convex/values";
import type { GameEngine, GameStatus } from "../engine.js";
import {
	hasOtherPlayableBoard,
	isBoardFinished,
	markOf,
	metaWinnerOf,
	playerIndexOf
} from "./rules.js";
import { tictactoeMove, tictactoeState } from "./schema.js";

export type TictactoeState = Infer<typeof tictactoeState>;
export type TictactoeMove = Infer<typeof tictactoeMove>;

const BOARD_COUNT = 9;
const CELLS_PER_BOARD = 9;

function createInitialState(): TictactoeState {
	return {
		kind: "tictactoe",
		boards: Array.from({ length: BOARD_COUNT }, () =>
			Array<TictactoeState["boards"][number][number]>(CELLS_PER_BOARD).fill(null)
		)
	};
}

function status(state: TictactoeState): GameStatus {
	const totalFilled = state.boards.reduce(
		(sum, board) => sum + board.filter((cell) => cell !== null).length,
		0
	);
	const turnIndex = totalFilled % 2 === 0 ? 0 : 1;

	const metaWinner = metaWinnerOf(state.boards);
	if (metaWinner) return { turnIndex, winnerIndex: playerIndexOf(metaWinner), isOver: true };

	const allBoardsFinished = state.boards.every(isBoardFinished);
	return { turnIndex, winnerIndex: null, isOver: allBoardsFinished };
}

/** The room's winner once three boards are won in a line; null while undecided or on a full-grid draw. */
function roundWinner(state: TictactoeState): number | null {
	return status(state).winnerIndex;
}

function applyMove(
	state: TictactoeState,
	playerIndex: number,
	move: TictactoeMove
): TictactoeState {
	const symbol = markOf(playerIndex);
	const board = state.boards[move.boardIndex];
	if (!board || isBoardFinished(board) || board[move.cellIndex] !== null) return state;

	const currentStatus = status(state);
	if (currentStatus.isOver) return state;
	if (playerIndex !== currentStatus.turnIndex) throw new Error("Not your turn");

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
	roundWinner
};
