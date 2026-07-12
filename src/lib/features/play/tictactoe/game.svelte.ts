import { useQuery, type UseQueryReturn } from "convex-svelte";
import {
	hasOtherPlayableBoard,
	WINNING_LINES
} from "../../../../../convex/models/games/tictactoe/rules.js";
import { api } from "../../../../../convex/_generated/api.js";
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

/**
 * Rune-backed multiplayer state for a room of nine synced tic-tac-toe boards.
 * Wraps a live Convex subscription (convex/models/rooms is the source of truth
 * for legality — whose turn it is, who's a player in the room); this class
 * mirrors that data for the UI and derives per-board status from it.
 */
export class TictactoeRoom extends Room {
	#history: UseQueryReturn<typeof api.models.rooms.index.history>;

	/** Local scrubber position into this round's move history; null means "live" (always the latest state).
	 *  Purely a per-browser viewing cursor — never sent to the server and never affects the real game. */
	#cursor = $state<number | null>(null);

	constructor(getCode: () => string, getRound: () => number | undefined = () => undefined) {
		super("tictactoe", getCode, getRound);
		this.#history = useQuery(api.models.rooms.index.history, () => ({
			code: this.getCode(),
			round: getRound()
		}));

		$effect(() => {
			// A round reset clears history server-side; drop any stale cursor back to live.
			if (this.#historyMoves.length === 0) this.#cursor = null;
		});
	}

	#state = $derived(this.data && this.data.state.kind === "tictactoe" ? this.data.state : null);

	get #historyMoves() {
		return this.#history.data ?? [];
	}

	/** Index of the latest played move this round, or -1 before any move has been made. */
	#latestIndex = $derived(this.#historyMoves.length - 1);

	/** True while this browser is scrubbed away from the live position — purely local, doesn't affect the room. */
	isViewingHistory = $derived(this.#cursor !== null);

	/** The board snapshot currently shown: the cursor's historical snapshot, or the live state when the cursor is null. */
	#displayState = $derived.by(() => {
		if (this.#cursor === null) return this.#state;
		const move = this.#historyMoves[this.#cursor];
		return move && move.state.kind === "tictactoe" ? move.state : this.#state;
	});

	/** 1-based position currently shown, for a "move X of Y" indicator. */
	viewedMoveNumber = $derived((this.#cursor ?? this.#latestIndex) + 1);
	historyLength = $derived(this.#historyMoves.length);

	boards = $derived(this.#displayState?.boards ?? []);
	statuses = $derived(this.boards.map(statusOf));
	mySymbol = $derived<Player | null>(
		this.data?.myIndex === 0 ? "X" : this.data?.myIndex === 1 ? "O" : null
	);

	/** Each board's own winner treated as a meta 3x3 grid — three boards in a line wins the room. */
	metaBoard = $derived<Board>(this.statuses.map((s) => s.winner));
	metaStatus = $derived(statusOf(this.metaBoard));
	winner = $derived(this.metaStatus.winner);
	winningLine = $derived(this.metaStatus.winningLine);
	isOver = $derived(this.metaStatus.status !== "playing");

	/** Whose mark lands next across the whole room, derived from total filled cells — no state to fall out of sync. */
	turn = $derived(
		(this.boards.reduce((sum, board) => sum + board.filter((cell) => cell !== null).length, 0) %
			2 ===
		0
			? "X"
			: "O") as Player
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
			this.isLive &&
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

	/** Step one move back in this round's history. A no-op past the first move. Local only. */
	stepBack(): void {
		if (this.#historyMoves.length === 0) return;
		const current = this.#cursor ?? this.#latestIndex;
		this.#cursor = Math.max(0, current - 1);
	}

	/** Step one move toward the present. Reaching the latest move returns to the live position. Local only. */
	stepForward(): void {
		if (this.#cursor === null) return;
		this.#cursor = this.#cursor + 1 >= this.#latestIndex ? null : this.#cursor + 1;
	}

	/** Jump to the live position. Local only. */
	jumpToLatest(): void {
		this.#cursor = null;
	}

	/** Jump to the first move of this round. Local only. */
	jumpToFirst(): void {
		if (this.#historyMoves.length === 0) return;
		this.#cursor = 0;
	}

	async play(boardIndex: number, cellIndex: number): Promise<void> {
		if (this.boards[boardIndex]?.[cellIndex] !== null || !this.canPlay(boardIndex)) return;
		await this.submitMove({ kind: "tictactoe", boardIndex, cellIndex });
	}

	override async newGame(): Promise<void> {
		this.#cursor = null;
		await super.newGame();
	}
}
