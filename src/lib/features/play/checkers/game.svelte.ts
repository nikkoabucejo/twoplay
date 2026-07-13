import { computeLegalMoves } from "../../../../../convex/models/games/checkers/rules.js";
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

	#state = $derived(this.data && this.data.game.state.kind === "checkers" ? this.data.game.state : null);
	#liveTurn = $derived<PieceColor>(this.#state?.turn ?? "cyan");
	#liveLegalMoves = $derived(
		computeLegalMoves(this.#state?.board ?? [], this.#liveTurn, this.#state?.mustContinueFrom ?? null)
	);
	/** No legal moves for the side to move means that side is out of moves or pieces — the other color wins. */
	#liveWinner = $derived<PieceColor | null>(
		this.#state !== null && this.#liveLegalMoves.length === 0
			? this.#liveTurn === "cyan"
				? "pink"
				: "cyan"
			: null
	);

	/** The board snapshot currently shown: the cursor's historical snapshot, or the live state when live. */
	#displayState = $derived(this.displayState?.kind === "checkers" ? this.displayState : null);

	board = $derived<Board>(this.#displayState?.board ?? []);
	turn = $derived<PieceColor>(this.#displayState?.turn ?? "cyan");
	mustContinueFrom = $derived(this.#displayState?.mustContinueFrom ?? null);

	legalMoves = $derived(computeLegalMoves(this.board, this.turn, this.mustContinueFrom));

	/** The piece the UI treats as selected: a forced multi-jump continuation always wins over a free click. */
	effectiveSelected = $derived(this.mustContinueFrom ?? this.selected);

	myColor = $derived<PieceColor | null>(
		this.data?.myIndex === 0 ? "cyan" : this.data?.myIndex === 1 ? "pink" : null
	);
	isMyTurn = $derived(
		this.game.isLive &&
			!this.isViewingHistory &&
			this.myColor !== null &&
			this.myColor === this.#liveTurn
	);

	winner = $derived<PieceColor | null>(
		this.#displayState !== null && this.legalMoves.length === 0
			? this.turn === "cyan"
				? "pink"
				: "cyan"
			: null
	);

	override activeSeat = $derived<0 | 1 | null>(
		this.game.isLive && this.game.endedSeat === null && this.#liveWinner === null
			? this.#liveTurn === "cyan"
				? 0
				: 1
			: null
	);

	movesFrom(index: number): Move[] {
		return this.legalMoves.filter((move) => move.from === index);
	}

	canSelect(index: number): boolean {
		return this.isMyTurn && this.legalMoves.some((move) => move.from === index);
	}

	async select(index: number): Promise<void> {
		if (this.winner || !this.isMyTurn) return;

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
