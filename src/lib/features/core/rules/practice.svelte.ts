import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import type { CheckersState } from "../../../../../convex/models/games/checkers/index.js";
import {
	computeLegalMoves,
	playerIndexOf as seatOfColor
} from "../../../../../convex/models/games/checkers/rules.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
import type { ChessState } from "../../../../../convex/models/games/chess/index.js";
import {
	boardOf,
	checkedKing,
	isPromotion,
	legalMoves as legalMovesOf,
	seatOfColor as seatOfChessColor,
	squareName,
	type PromotionPiece,
	type Square as ChessSquare
} from "../../../../../convex/models/games/chess/rules.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import type { TictactoeState } from "../../../../../convex/models/games/tictactoe/index.js";
import { movePieceIds, pieceIds } from "./demo.js";

export type PracticeResult = { winner: 0 | 1 | null } | null;

/** Both seats on one screen, checked by the real tic-tac-toe engine. */
export class TictactoePractice {
	state = $state.raw<TictactoeState>(tictactoeEngine.createInitialState());
	lastMove = $state.raw<{ boardIndex: number; cellIndex: number; seat: 0 | 1 } | null>(null);
	/** Why the engine refused the last attempt; cleared by the next accepted move. */
	notice = $state<string | null>(null);

	#status = $derived(tictactoeEngine.status(this.state));

	get turn(): 0 | 1 {
		return this.#status.turnIndex === 0 ? 0 : 1;
	}

	get result(): PracticeResult {
		if (!this.#status.isOver) return null;
		const winner = this.#status.winnerIndex;
		return { winner: winner === 0 || winner === 1 ? winner : null };
	}

	/** Returns whether the engine accepted the move. */
	play(boardIndex: number, cellIndex: number): boolean {
		const seat = this.turn;
		let next: TictactoeState;
		try {
			next = tictactoeEngine.applyMove(this.state, seat, {
				kind: "tictactoe",
				boardIndex,
				cellIndex
			});
		} catch (error) {
			this.notice = error instanceof Error ? error.message : String(error);
			return false;
		}
		if (next === this.state) return false;
		this.state = next;
		this.lastMove = { boardIndex, cellIndex, seat };
		this.notice = null;
		return true;
	}

	reset(): void {
		this.state = tictactoeEngine.createInitialState();
		this.lastMove = null;
		this.notice = null;
	}
}

/** Both seats on one screen, checked by the real checkers engine. */
export class CheckersPractice {
	state = $state.raw<CheckersState>(checkersEngine.createInitialState());
	ids = $state.raw(pieceIds(checkersEngine.createInitialState().board));
	selected = $state<number | null>(null);
	lastMove = $state.raw<{ from: number; to: number; seat: 0 | 1 } | null>(null);
	notice = $state<string | null>(null);

	legalMoves = $derived(
		computeLegalMoves(this.state.board, this.state.turn, this.state.mustContinueFrom)
	);

	/** A piece mid multi-jump stays selected; it is the only one allowed to move. */
	get activePiece(): number | null {
		return this.state.mustContinueFrom ?? this.selected;
	}

	get turn(): 0 | 1 {
		return seatOfColor(this.state.turn);
	}

	get isCaptureForced(): boolean {
		return this.legalMoves.length > 0 && this.legalMoves.every((move) => move.captured !== null);
	}

	/** Squares of the pieces that can move now, when capturing is forced. */
	get forcedPieces(): number[] {
		return this.isCaptureForced ? [...new Set(this.legalMoves.map((move) => move.from))] : [];
	}

	get destinations(): number[] {
		const from = this.activePiece;
		return from === null
			? []
			: this.legalMoves.filter((move) => move.from === from).map((move) => move.to);
	}

	get result(): PracticeResult {
		return this.legalMoves.length === 0 ? { winner: this.turn === 0 ? 1 : 0 } : null;
	}

	/** Picks up a piece, or moves the picked-up piece onto `index`. Returns whether a move was made. */
	select(index: number): boolean {
		const from = this.activePiece;
		if (from !== null && this.destinations.includes(index)) {
			const next = checkersEngine.applyMove(this.state, this.turn, {
				kind: "checkers",
				from,
				to: index
			});
			this.ids = movePieceIds(this.ids, from, index);
			this.lastMove = { from, to: index, seat: this.turn };
			this.state = next;
			this.selected = null;
			this.notice = null;
			return true;
		}
		if (this.state.mustContinueFrom !== null) {
			this.notice = "Keep jumping with the same piece";
			return false;
		}
		const piece = this.state.board[index];
		if (piece && seatOfColor(piece.color) === this.turn) {
			const canMove = this.legalMoves.some((move) => move.from === index);
			this.selected = canMove ? index : null;
			this.notice = canMove
				? null
				: this.isCaptureForced
					? "You have to capture"
					: "That piece can't move";
			return false;
		}
		this.selected = null;
		return false;
	}

	reset(): void {
		this.state = checkersEngine.createInitialState();
		this.ids = pieceIds(this.state.board);
		this.selected = null;
		this.lastMove = null;
		this.notice = null;
	}
}

/** Both seats on one screen, checked by the real chess engine. */
export class ChessPractice {
	state = $state.raw<ChessState>(chessEngine.createInitialState());
	selected = $state<ChessSquare | null>(null);
	/** A pawn move to the last rank waiting for its piece to be picked. */
	pendingPromotion = $state<{ from: ChessSquare; to: ChessSquare } | null>(null);
	lastMove = $state.raw<{ from: ChessSquare; to: ChessSquare; seat: 0 | 1 } | null>(null);
	notice = $state<string | null>(null);

	#status = $derived(chessEngine.status(this.state));

	board = $derived(boardOf(this.state.fen));
	legalMoves = $derived(legalMovesOf(this.state.fen));
	checkSquare = $derived(checkedKing(this.state.fen));

	/** Squares the selected piece can move to; a promotion's four pieces share one square. */
	destinations = $derived([
		...new Set(this.legalMoves.filter((move) => move.from === this.selected).map((move) => move.to))
	]);

	get turn(): 0 | 1 {
		return this.#status.turnIndex === 0 ? 0 : 1;
	}

	get result(): PracticeResult {
		if (!this.#status.isOver) return null;
		const winner = this.#status.winnerIndex;
		return { winner: winner === 0 || winner === 1 ? winner : null };
	}

	/** Picks up a piece, or moves the picked-up piece onto `index`. Returns whether a move was made. */
	select(index: number): boolean {
		if (this.result !== null) return false;
		const square = squareName(index);
		const piece = this.board[index];
		if (piece && seatOfChessColor(piece.color) === this.turn) {
			const canMove = this.legalMoves.some((move) => move.from === square);
			this.selected = canMove && square !== this.selected ? square : null;
			this.notice = canMove ? null : "That piece can't move";
			return false;
		}
		const from = this.selected;
		if (from === null) return false;
		if (isPromotion(this.state.fen, from, square)) {
			this.selected = null;
			this.pendingPromotion = { from, to: square };
			return false;
		}
		return this.#play(from, square);
	}

	promote(piece: PromotionPiece): boolean {
		if (this.pendingPromotion === null) return false;
		const { from, to } = this.pendingPromotion;
		this.pendingPromotion = null;
		return this.#play(from, to, piece);
	}

	cancelPromotion(): void {
		this.pendingPromotion = null;
	}

	#play(from: ChessSquare, to: ChessSquare, promotion?: PromotionPiece): boolean {
		const seat = this.turn;
		const next = chessEngine.applyMove(this.state, seat, { kind: "chess", from, to, promotion });
		if (next === this.state) {
			this.notice = "That piece can't move there";
			return false;
		}
		this.state = next;
		this.lastMove = { from, to, seat };
		this.selected = null;
		this.notice = null;
		return true;
	}

	reset(): void {
		this.state = chessEngine.createInitialState();
		this.selected = null;
		this.pendingPromotion = null;
		this.lastMove = null;
		this.notice = null;
	}
}
