import {
	colorOfPlayer,
	computeLegalMoves,
	otherPlayer,
	playerIndexOf
} from "../../../../../convex/models/games/checkers/rules.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import { Room, type ClientEngine } from "$lib/utils/multiplayer";
import type { Board, Move, PieceColor } from "./types.js";

const checkersClientEngine: ClientEngine = {
	applyMove(state, seat, move) {
		if (state.kind !== "checkers" || move.kind !== "checkers") {
			throw new Error("Move does not match this room's game");
		}
		return checkersEngine.applyMove(state, seat, move);
	},
	status(state) {
		if (state.kind !== "checkers") throw new Error("State does not match this room's game");
		return checkersEngine.status(state);
	}
};

/**
 * Rune-backed multiplayer state for a room of checkers. Wraps a live Convex subscription
 * (convex/models/rooms is the source of truth for legality); this class mirrors that data for the UI
 * and derives legal moves / win state from it, the same way TictactoeRoom derives board status.
 */
export class CheckersRoom extends Room {
	selected = $state<number | null>(null);

	constructor(getCode: () => string, getRound: () => number | undefined = () => undefined) {
		super("checkers", checkersClientEngine, getCode, getRound);
	}

	/** The board snapshot currently shown: the cursor's historical snapshot, or the live state when live. */
	#displayState = $derived(this.displayState?.kind === "checkers" ? this.displayState : null);

	board = $derived<Board>(this.#displayState?.board ?? []);
	turn = $derived<PieceColor>(this.#displayState?.turn ?? colorOfPlayer(0));
	mustContinueFrom = $derived(this.#displayState?.mustContinueFrom ?? null);

	legalMoves = $derived(computeLegalMoves(this.board, this.turn, this.mustContinueFrom));

	/** The piece the UI treats as selected: a forced multi-jump continuation always wins over a free click.
	 *  Free selections are ignored as soon as the live board advances and that source is no longer legal. */
	effectiveSelected = $derived.by(() => {
		if (this.mustContinueFrom !== null) return this.mustContinueFrom;
		if (this.selected === null) return null;
		return this.legalMoves.some((move) => move.from === this.selected) ? this.selected : null;
	});

	myColor = $derived<PieceColor | null>(this.myIndex === null ? null : colorOfPlayer(this.myIndex));
	/** Moves are blocked while scrubbing history, even though the live turn is still the viewer's. */
	canMove = $derived(this.isMyTurn && !this.isViewingHistory);

	winner = $derived<PieceColor | null>(
		this.#displayState !== null && this.legalMoves.length === 0
			? colorOfPlayer(otherPlayer(playerIndexOf(this.turn)))
			: null
	);

	/** True on the viewer's live turn when every legal move is a capture. Reads the live state, so
	 *  scrubbing doesn't change it. */
	mustCapture = $derived.by(() => {
		const live = this.liveState;
		if (!this.isMyTurn || live?.kind !== "checkers") return false;
		const moves = computeLegalMoves(live.board, live.turn, live.mustContinueFrom);
		return moves.length > 0 && moves.every((move) => move.captured !== null);
	});

	/** The step or jump from the position before the shown one: the square the mover's piece left and
	 *  the one it landed on. Before the first history entry, the position before is the start. */
	lastMove = $derived.by((): { from: number; to: number; seat: 0 | 1 } | null => {
		const previous = this.previousDisplayState;
		const before =
			previous?.kind === "checkers" ? previous.board : checkersEngine.createInitialState().board;
		const to = this.board.findIndex((square, index) => square !== null && before[index] === null);
		const piece = this.board[to];
		if (!piece) return null;
		const from = before.findIndex(
			(square, index) => square?.color === piece.color && this.board[index] === null
		);
		return from === -1 ? null : { from, to, seat: playerIndexOf(piece.color) };
	});

	/** What the viewer's piece on `index` can do this turn, for its label. */
	abilityOf(index: number): "capture" | "move" | null {
		if (!this.canMove) return null;
		const moves = this.movesFrom(index);
		if (moves.length === 0) return null;
		return moves.some((move) => move.captured !== null) ? "capture" : "move";
	}

	movesFrom(index: number): Move[] {
		return this.legalMoves.filter((move) => move.from === index);
	}

	canSelect(index: number): boolean {
		return this.canMove && this.legalMoves.some((move) => move.from === index);
	}

	async select(index: number): Promise<void> {
		if (this.winner || !this.canMove) return;

		const from = this.effectiveSelected;
		if (from !== null) {
			const move = this.legalMoves.find((m) => m.from === from && m.to === index);
			if (move) {
				this.selected = null;
				await this.submitMove({ kind: "checkers", from: move.from, to: move.to });
				return;
			}
		}

		if (this.mustContinueFrom !== null) return;
		this.selected = this.canSelect(index) ? index : null;
	}

	override async rematch(): Promise<void> {
		this.selected = null;
		await super.rematch();
	}
}
