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
