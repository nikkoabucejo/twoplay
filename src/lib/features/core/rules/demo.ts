import type { GameEngine } from "../../../../../convex/models/games/engine.js";
import { idx, rc } from "../../../../../convex/models/games/checkers/rules.js";
import type { Square } from "../../../../../convex/models/games/checkers/rules.js";

export type DemoAction<Move> = {
	move: Move;
	/** Shown instead of the engine's reason when the engine refuses the move. */
	note?: string;
};

export type DemoStep<State> = {
	/** The position after the action: unchanged when the engine refused it. */
	state: State;
	seat: 0 | 1;
	rejection: string | null;
};

/** Replays a demo through the game's real engine, so a demo can never show a move the server would
 *  refuse as legal. A refused move keeps the position and records why. */
export function demoSteps<State, Move>(
	engine: GameEngine<State, Move>,
	start: State,
	actions: readonly DemoAction<Move>[]
): DemoStep<State>[] {
	const steps: DemoStep<State>[] = [];
	let state = start;
	for (const action of actions) {
		const seat = engine.status(state).turnIndex === 0 ? 0 : 1;
		let next = state;
		let reason: string | null = null;
		try {
			next = engine.applyMove(state, seat, action.move);
		} catch (error) {
			reason = error instanceof Error ? error.message : String(error);
		}
		const rejection = next === state ? (action.note ?? reason ?? "That move isn't allowed") : null;
		steps.push({ state: next, seat, rejection });
		state = next;
	}
	return steps;
}

/** A stable id per checkers piece, so a moved piece glides instead of popping in. */
export function pieceIds(board: readonly Square[]): (number | null)[] {
	return board.map((square, index) => (square ? index : null));
}

export function movePieceIds(
	ids: readonly (number | null)[],
	from: number,
	to: number
): (number | null)[] {
	const next = ids.slice();
	next[to] = ids[from];
	next[from] = null;
	const [fromRow, fromCol] = rc(from);
	const [toRow, toCol] = rc(to);
	if (Math.abs(toRow - fromRow) === 2)
		next[idx((fromRow + toRow) / 2, (fromCol + toCol) / 2)] = null;
	return next;
}
