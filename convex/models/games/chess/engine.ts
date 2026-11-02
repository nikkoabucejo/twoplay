import type { Infer } from "convex/values";
import { otherPlayer, type GameEngine, type GameStatus } from "../engine.js";
import { colorOfSeat, initialPosition, outcome, play, seatOfColor, turnOf } from "./rules.js";
import { chessMove, chessState } from "./schema.js";

export type ChessState = Infer<typeof chessState>;
export type ChessMove = Infer<typeof chessMove>;

function createInitialState(): ChessState {
	return { kind: "chess", ...initialPosition() };
}

function status(state: ChessState): GameStatus {
	const turnIndex = seatOfColor(turnOf(state.fen));
	const ending = outcome(state);
	if (ending === null) return { turnIndex, winnerIndex: null, isOver: false };
	const winnerIndex = ending === "checkmate" ? otherPlayer(turnIndex) : null;
	return { turnIndex, winnerIndex, isOver: true };
}

/** The seat that delivered checkmate; null while in progress or for a draw. */
function roundWinner(state: ChessState): number | null {
	return status(state).winnerIndex;
}

function applyMove(state: ChessState, playerIndex: number, move: ChessMove): ChessState {
	if (status(state).isOver) return state;
	if (colorOfSeat(playerIndex) !== turnOf(state.fen)) throw new Error("Not your turn");

	const next = play(state, move);
	return next === null ? state : { kind: "chess", ...next };
}

export const chessEngine: GameEngine<ChessState, ChessMove> = {
	kind: "chess",
	playerCount: 2,
	createInitialState,
	applyMove,
	status,
	roundWinner
};
