import {
	colorOfPlayer,
	computeLegalMoves,
	otherPlayer,
	playerIndexOf
} from "../../../../../convex/models/games/checkers/rules.js";
import { Room } from "$lib/utils/multiplayer";
import type { Board, Move, PieceColor } from "./types.js";

/**
 * Rune-backed multiplayer state for a room of checkers. Wraps a live Convex subscription
 * (convex/models/rooms is the source of truth for legality); this class mirrors that data for the UI
 * and derives legal moves / win state from it, the same way TictactoeRoom derives board status.
 */
export class CheckersRoom extends Room {
	selected = $state<number | null>(null);

	constructor(getCode: () => string, getRound: () => number | undefined = () => undefined) {
		super("checkers", getCode, getRound);
	}

	#state = $derived(
		this.data && this.data.game.state.kind === "checkers" ? this.data.game.state : null
	);
	#liveTurn = $derived<PieceColor>(this.#state?.turn ?? colorOfPlayer(0));
	#liveLegalMoves = $derived(
		computeLegalMoves(
			this.#state?.board ?? [],
			this.#liveTurn,
			this.#state?.mustContinueFrom ?? null
		)
	);
	/** No legal moves for player 1 or player 2 (whichever is to move) means they're out of moves or
	 *  pieces — the other player wins. */
	#liveWinner = $derived<PieceColor | null>(
		this.#state !== null && this.#liveLegalMoves.length === 0
			? colorOfPlayer(otherPlayer(playerIndexOf(this.#liveTurn)))
			: null
	);

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

	override activeSeat = $derived<0 | 1 | null>(
		this.game.isLive && this.game.endedSeat === null && this.#liveWinner === null
			? playerIndexOf(this.#liveTurn)
			: null
	);

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
