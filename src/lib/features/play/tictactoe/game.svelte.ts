import { useMutation, useQuery, type UseQueryReturn } from "convex-svelte";
import { api } from "../../../../../convex/_generated/api.js";
import type { Board, GameStatus, Player } from "./types.js";

const WINNING_LINES: readonly (readonly [number, number, number])[] = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8], // rows
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8], // columns
	[0, 4, 8],
	[2, 4, 6] // diagonals
];

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
 * Wraps a live Convex subscription (convex/rooms.ts is the source of truth
 * for legality — whose turn it is, who's a player in the room); this class
 * mirrors that data for the UI and derives per-board status from it.
 */
export class TictactoeRoom {
	error = $state<string | null>(null);

	#getCode: () => string;
	#room: UseQueryReturn<typeof api.rooms.get>;
	#play = useMutation(api.rooms.play);
	#reset = useMutation(api.rooms.reset);

	constructor(getCode: () => string) {
		this.#getCode = getCode;
		this.#room = useQuery(api.rooms.get, () => ({ code: this.#getCode() }));
	}

	get isLoading() {
		return this.#room.isLoading;
	}

	get data() {
		return this.#room.data;
	}

	/** True once the room is found but belongs to a different game type — a room-code collision across games. */
	wrongGameType = $derived(this.data != null && this.data.gameType !== "tictactoe");

	#state = $derived(this.data && this.data.state.kind === "tictactoe" ? this.data.state : null);

	boards = $derived(this.#state?.boards ?? []);
	statuses = $derived(this.boards.map(statusOf));
	mySymbol = $derived<Player | null>(
		this.data?.myIndex === 0 ? "X" : this.data?.myIndex === 1 ? "O" : null
	);
	myLastBoard = $derived(
		this.mySymbol ? (this.#state?.lastBoardBySymbol?.[this.mySymbol] ?? null) : null
	);

	playerX = $derived(this.data?.players?.[0] ?? null);
	playerO = $derived(this.data?.players?.[1] ?? null);

	/** Mini-boards won by each side, used as an at-a-glance score. */
	scoreX = $derived(this.statuses.filter((s) => s.winner === "X").length);
	scoreO = $derived(this.statuses.filter((s) => s.winner === "O").length);

	/** Whose mark lands next across the whole room, derived from total filled cells — no state to fall out of sync. */
	turn = $derived(
		(this.boards.reduce((sum, board) => sum + board.filter((cell) => cell !== null).length, 0) %
			2 ===
		0
			? "X"
			: "O") as Player
	);

	/** Whether some board other than `boardIndex` is still open — the repeat-board rule lifts when it's the only option left. */
	private hasOtherPlayableBoard(boardIndex: number): boolean {
		return this.statuses.some((status, i) => i !== boardIndex && status.status === "playing");
	}

	/** True when playing here would repeat this player's own last-turn board, and another board is still available. */
	isForbidden(boardIndex: number): boolean {
		return (
			this.mySymbol === this.turn &&
			boardIndex === this.myLastBoard &&
			this.hasOtherPlayableBoard(boardIndex)
		);
	}

	/** True when it's this browser's turn to place a mark on that board. */
	canPlay(boardIndex: number): boolean {
		const status = this.statuses[boardIndex];
		return (
			status?.status === "playing" && this.mySymbol === this.turn && !this.isForbidden(boardIndex)
		);
	}

	isWinningCell(boardIndex: number, cellIndex: number): boolean {
		return this.statuses[boardIndex]?.winningLine?.includes(cellIndex) ?? false;
	}

	async play(boardIndex: number, cellIndex: number): Promise<void> {
		if (this.boards[boardIndex]?.[cellIndex] !== null || !this.canPlay(boardIndex)) return;

		this.error = null;
		try {
			await this.#play({
				code: this.#getCode(),
				move: { kind: "tictactoe", boardIndex, cellIndex }
			});
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}

	async reset(): Promise<void> {
		this.error = null;
		try {
			await this.#reset({ code: this.#getCode() });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}
}
