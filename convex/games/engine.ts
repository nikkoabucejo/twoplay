export interface GameStatus {
	turnIndex: number | null;
	winnerIndex: number | null;
	isOver: boolean;
}

export interface GameEngine<State, Move> {
	kind: string;
	playerCount: number;
	createInitialState(): State;
	applyMove(state: State, playerIndex: number, move: Move): State;
	status(state: State): GameStatus;
	roleLabel(index: number): string;
}
