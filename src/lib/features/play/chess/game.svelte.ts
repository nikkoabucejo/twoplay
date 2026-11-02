import {
	INITIAL_FEN,
	boardOf,
	checkedKing,
	findMove,
	isPromotion,
	legalMoves as legalMovesOf,
	outcome as outcomeOf,
	seatOfColor,
	squareName,
	turnOf
} from "../../../../../convex/models/games/chess/rules.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
import { Room, type ClientEngine } from "$lib/utils/multiplayer";
import type { PromotionPiece, Square } from "./types.js";

const chessClientEngine: ClientEngine = {
	applyMove(state, seat, move) {
		if (state.kind !== "chess" || move.kind !== "chess") {
			throw new Error("Move does not match this room's game");
		}
		return chessEngine.applyMove(state, seat, move);
	},
	status(state) {
		if (state.kind !== "chess") throw new Error("State does not match this room's game");
		return chessEngine.status(state);
	}
};

/**
 * Rune-backed multiplayer state for a room of chess. Wraps a live Convex subscription
 * (convex/models/rooms is the source of truth for legality); this class mirrors that data for the UI
 * and derives legal moves, check, and the last move from it through the same rules the server uses.
 */
export class ChessRoom extends Room {
	selected = $state<Square | null>(null);
	#pendingPromotion = $state<{ from: Square; to: Square } | null>(null);

	constructor(getCode: () => string, getRound: () => number | undefined = () => undefined) {
		super("chess", chessClientEngine, getCode, getRound);
	}

	/** The position currently shown: the cursor's historical snapshot, or the live state when live. */
	#displayState = $derived(this.displayState?.kind === "chess" ? this.displayState : null);

	fen = $derived(this.#displayState?.fen ?? null);
	board = $derived(this.fen === null ? [] : boardOf(this.fen));
	turn = $derived(this.fen === null ? null : turnOf(this.fen));
	legalMoves = $derived(this.fen === null ? [] : legalMovesOf(this.fen));
	checkSquare = $derived(this.fen === null ? null : checkedKing(this.fen));
	outcome = $derived(this.#displayState === null ? null : outcomeOf(this.#displayState));

	/** Moves are blocked while scrubbing history, even though the live turn is still the viewer's. */
	canMove = $derived(this.isMyTurn && !this.isViewingHistory);

	/** A pawn move to the last rank waiting for the viewer to pick its piece. Hidden while the viewer
	 *  cannot move: scrubbing history, or after the round ends. */
	pendingPromotion = $derived(this.canMove ? this.#pendingPromotion : null);

	/** Ignored as soon as the shown position no longer has a legal move from it. */
	effectiveSelected = $derived(
		this.legalMoves.some((move) => move.from === this.selected) ? this.selected : null
	);

	/** Squares the selected piece can move to; a promotion's four pieces share one square. */
	destinations = $derived([
		...new Set(
			this.legalMoves.filter((move) => move.from === this.effectiveSelected).map((move) => move.to)
		)
	]);

	/** The move from the position before the shown one, which is the start before the first move. */
	lastMove = $derived.by((): { from: Square; to: Square; san: string; seat: 0 | 1 } | null => {
		if (this.fen === null) return null;
		const previous = this.previousDisplayState;
		const before = previous?.kind === "chess" ? previous.fen : INITIAL_FEN;
		const move = findMove(before, this.fen);
		if (move === null) return null;
		return { from: move.from, to: move.to, san: move.san, seat: seatOfColor(turnOf(before)) };
	});

	canSelect(index: number): boolean {
		const square = squareName(index);
		return this.canMove && this.legalMoves.some((move) => move.from === square);
	}

	async select(index: number): Promise<void> {
		const fen = this.fen;
		if (fen === null || this.outcome !== null || !this.canMove) return;

		const square = squareName(index);
		const from = this.effectiveSelected;
		if (from !== null && this.destinations.includes(square)) {
			this.selected = null;
			if (isPromotion(fen, from, square)) {
				this.#pendingPromotion = { from, to: square };
				return;
			}
			await this.submitMove({ kind: "chess", from, to: square });
			return;
		}

		this.selected = square !== from && this.canSelect(index) ? square : null;
	}

	async promote(piece: PromotionPiece): Promise<void> {
		const pending = this.pendingPromotion;
		this.#pendingPromotion = null;
		if (pending === null) return;
		const { from, to } = pending;
		await this.submitMove({ kind: "chess", from, to, promotion: piece });
	}

	cancelPromotion(): void {
		this.#pendingPromotion = null;
	}

	override async rematch(): Promise<void> {
		this.selected = null;
		this.#pendingPromotion = null;
		await super.rematch();
	}
}
