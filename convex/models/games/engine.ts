export interface GameStatus {
	turnIndex: number;
	winnerIndex: number | null;
	isOver: boolean;
}

export interface GameEngine<State, Move> {
	kind: string;
	playerCount: number;
	createInitialState(): State;
	applyMove(state: State, playerIndex: number, move: Move): State;
	status(state: State): GameStatus;
	/** Index of the round's winner (for score-keeping when a room starts a new game), or null if undecided/tied. */
	roundWinner(state: State): number | null;
}

/**
 * Maps a two-player game's own persisted symbols (a piece color, a mark, …) to and from a 0/1
 * player index, so game logic and UI can think in terms of player 1 / player 2 instead of each
 * game repeating its own "X"/"O" or "cyan"/"pink" branches. Each game calls this once, with its
 * own symbol pair, at its schema boundary — everywhere else uses `indexOf`/`symbolOf` instead of
 * the literal strings.
 */
export function playerSymbols<T extends string>(symbols: readonly [T, T]) {
	return {
		indexOf(symbol: T): 0 | 1 {
			return symbol === symbols[0] ? 0 : 1;
		},
		symbolOf(playerIndex: number): T {
			return playerIndex === 0 ? symbols[0] : symbols[1];
		}
	};
}

/** The other seat, for a two-player game. */
export function otherPlayer(playerIndex: number): 0 | 1 {
	return playerIndex === 0 ? 1 : 0;
}
