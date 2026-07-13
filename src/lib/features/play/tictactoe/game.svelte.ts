import {
	hasOtherPlayableBoard,
	markOf,
	playerIndexOf,
	WINNING_LINES
} from "../../../../../convex/models/games/tictactoe/rules.js";
import { Room } from "$lib/utils/multiplayer";
import type { Board, GameStatus, Player } from "./types.js";

function findWinningLine(board: Board): readonly [number, number, number] | null {
	for (const line of WINNING_LINES) {
		const [a, b, c] = line;
		if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
			return line;
		}
	}
	return null;
}

type BoardStatus = {
	winningLine: readonly [number, number, number] | null;
	winner: Player | null;
	status: GameStatus;
};

function statusOf(board: Board): BoardStatus {
	const winningLine = findWinningLine(board);
	const winner = winningLine ? (board[winningLine[0]] as Player) : null;
	const isDraw = winner === null && board.every((cell) => cell !== null);

	return {
		winningLine,
		winner,
		status: winner ? "won" : isDraw ? "draw" : "playing"
	};
}

function turnOf(boards: Board[]): Player {
	const totalFilled = boards.reduce(
		(sum, board) => sum + board.filter((cell) => cell !== null).length,
		0
	);
	return markOf(totalFilled % 2);
}

/**
 * Rune-backed multiplayer state for a room of nine synced tic-tac-toe boards.
 * Wraps a live Convex subscription (convex/models/rooms is the source of truth
 * for legality — whose turn it is, who's a player in the room); this class
 * mirrors that data for the UI and derives per-board status from it.
 */
export class TictactoeRoom extends Room {
	constructor(getCode: () => string, getRound: () => number | undefined = () => undefined) {
		super("tictactoe", getCode, getRound);
	}

	#state = $derived(
		this.data && this.data.game.state.kind === "tictactoe" ? this.data.game.state : null
	);
	#liveBoards = $derived(this.#state?.boards ?? []);
	#liveBoardStatuses = $derived(this.#liveBoards.map(statusOf));
	#liveMetaStatus = $derived(statusOf(this.#liveBoardStatuses.map((s) => s.winner)));
	#liveIsOver = $derived(
		this.#liveMetaStatus.winner !== null ||
			this.#liveBoardStatuses.every((s) => s.status !== "playing")
	);
	#liveTurn = $derived(turnOf(this.#liveBoards));

	/** The board snapshot currently shown: the cursor's historical snapshot, or the live state when live. */
	#displayState = $derived(this.displayState?.kind === "tictactoe" ? this.displayState : null);

	boards = $derived(this.#displayState?.boards ?? []);
	statuses = $derived(this.boards.map(statusOf));
	mySymbol = $derived<Player | null>(this.myIndex === null ? null : markOf(this.myIndex));

	/** Each board's own winner treated as a meta 3x3 grid — three boards in a line wins the room.
	 *  A drawn board contributes null, same as an empty cell, so it can't complete a meta line —
	 *  meaning the meta board alone can't tell a draw apart from boards still in progress. */
	metaBoard = $derived<Board>(this.statuses.map((s) => s.winner));
	metaStatus = $derived(statusOf(this.metaBoard));
	winner = $derived(this.metaStatus.winner);
	winningLine = $derived(this.metaStatus.winningLine);
	/** The room is over once a meta line is won, or every individual board has finished (won or drawn) —
	 *  checking metaStatus alone would miss a draw, since drawn boards never fill the meta board. */
	isOver = $derived(
		this.winner !== null || this.statuses.every((s) => s.status !== "playing")
	);

	/** Whose mark lands next across the whole room, derived from total filled cells — no state to fall out of sync. */
	turn = $derived(turnOf(this.boards));

	override activeSeat = $derived<0 | 1 | null>(
		this.game.isLive &&
			this.#state !== null &&
			this.game.endedSeat === null &&
			!this.#liveIsOver
			? playerIndexOf(this.#liveTurn)
			: null
	);

	/** Board the currently active player (whoever's turn it is) last played on — visible to both
	 *  browsers alike, so you can see your opponent's restricted board while it's their turn too. */
	activeLastBoard = $derived(this.#displayState?.lastBoardBySymbol?.[this.turn] ?? null);

	/** True when playing here would repeat the active player's own last-turn board, and another board is still available. */
	isForbidden(boardIndex: number): boolean {
		return boardIndex === this.activeLastBoard && hasOtherPlayableBoard(this.boards, boardIndex);
	}

	/** True when it's this browser's turn to place a mark on that board. Always false while scrubbing
	 *  history or while pinned to a past round. */
	canPlay(boardIndex: number): boolean {
		const status = this.statuses[boardIndex];
		return (
			this.game.isLive &&
			!this.isViewingHistory &&
			!this.isOver &&
			status?.status === "playing" &&
			this.mySymbol === this.turn &&
			!this.isForbidden(boardIndex)
		);
	}

	isWinningCell(boardIndex: number, cellIndex: number): boolean {
		return this.statuses[boardIndex]?.winningLine?.includes(cellIndex) ?? false;
	}

	async play(boardIndex: number, cellIndex: number): Promise<void> {
		if (this.boards[boardIndex]?.[cellIndex] !== null || !this.canPlay(boardIndex)) return;
		await this.submitMove({ kind: "tictactoe", boardIndex, cellIndex });
	}
}
