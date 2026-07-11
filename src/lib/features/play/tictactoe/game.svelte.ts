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

function emptyBoard(): Board {
	return Array<null>(9).fill(null);
}

function findWinningLine(board: Board): readonly [number, number, number] | null {
	for (const line of WINNING_LINES) {
		const [a, b, c] = line;
		if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
			return line;
		}
	}
	return null;
}

/**
 * Rune-backed game state for a single game of tic-tac-toe.
 * Instantiate once per board; all derived values update automatically.
 */
export class TictactoeGame {
	board = $state<Board>(emptyBoard());
	currentPlayer = $state<Player>("X");

	winningLine = $derived(findWinningLine(this.board));
	winner = $derived<Player | null>(
		this.winningLine ? (this.board[this.winningLine[0]] as Player) : null
	);
	isDraw = $derived(this.winner === null && this.board.every((cell) => cell !== null));
	status = $derived<GameStatus>(this.winner ? "won" : this.isDraw ? "draw" : "playing");

	/** Place the current player's mark, then hand the turn over. No-op on filled cells or a finished game. */
	play(index: number): void {
		if (this.board[index] !== null || this.status !== "playing") return;
		this.board[index] = this.currentPlayer;
		this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
	}

	/** True when the cell is part of the winning line, for highlighting. */
	isWinningCell(index: number): boolean {
		return this.winningLine?.includes(index) ?? false;
	}

	reset(): void {
		this.board = emptyBoard();
		this.currentPlayer = "X";
	}
}
