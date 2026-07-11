import { useMutation, useQuery, type UseQueryReturn } from "convex-svelte";
import { api } from "../../../../../convex/_generated/api.js";
import type { Board, Move, Piece, PieceColor } from "./types.js";

const SIZE = 8;
const KING_DIRECTIONS: readonly [number, number][] = [
	[-1, -1],
	[-1, 1],
	[1, -1],
	[1, 1]
];

function idx(row: number, col: number): number {
	return row * SIZE + col;
}

function rc(index: number): [number, number] {
	return [Math.floor(index / SIZE), index % SIZE];
}

function inBounds(row: number, col: number): boolean {
	return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function directionsFor(piece: Piece): readonly [number, number][] {
	if (piece.king) return KING_DIRECTIONS;
	return piece.color === "cyan"
		? [
				[-1, -1],
				[-1, 1]
			]
		: [
				[1, -1],
				[1, 1]
			];
}

function simpleMovesFrom(board: Board, index: number): Move[] {
	const piece = board[index];
	if (!piece) return [];
	const [row, col] = rc(index);
	const moves: Move[] = [];
	for (const [dr, dc] of directionsFor(piece)) {
		const toRow = row + dr;
		const toCol = col + dc;
		if (!inBounds(toRow, toCol)) continue;
		if (board[idx(toRow, toCol)] === null) {
			moves.push({ from: index, to: idx(toRow, toCol), captured: null });
		}
	}
	return moves;
}

function captureMovesFrom(board: Board, index: number): Move[] {
	const piece = board[index];
	if (!piece) return [];
	const [row, col] = rc(index);
	const moves: Move[] = [];
	for (const [dr, dc] of directionsFor(piece)) {
		const midRow = row + dr;
		const midCol = col + dc;
		const landRow = row + dr * 2;
		const landCol = col + dc * 2;
		if (!inBounds(landRow, landCol)) continue;
		const midPiece = board[idx(midRow, midCol)];
		if (midPiece && midPiece.color !== piece.color && board[idx(landRow, landCol)] === null) {
			moves.push({ from: index, to: idx(landRow, landCol), captured: idx(midRow, midCol) });
		}
	}
	return moves;
}

/**
 * Mirrors convex/games/checkers/engine.ts's move generation so the UI can highlight legal destinations
 * without waiting on a round trip — convex/rooms.ts (via the checkers engine) remains the source of truth
 * for legality when a move is actually submitted.
 */
function computeLegalMoves(
	board: Board,
	color: PieceColor,
	mustContinueFrom: number | null
): Move[] {
	if (mustContinueFrom !== null) return captureMovesFrom(board, mustContinueFrom);

	const indices: number[] = [];
	board.forEach((piece, i) => {
		if (piece && piece.color === color) indices.push(i);
	});

	const captures = indices.flatMap((i) => captureMovesFrom(board, i));
	if (captures.length > 0) return captures;

	return indices.flatMap((i) => simpleMovesFrom(board, i));
}

/**
 * Rune-backed multiplayer state for a room of checkers. Wraps a live Convex subscription
 * (convex/rooms.ts is the source of truth for legality); this class mirrors that data for the UI
 * and derives legal moves / win state from it, the same way TictactoeRoom derives board status.
 */
export class CheckersRoom {
	error = $state<string | null>(null);
	selected = $state<number | null>(null);

	#getCode: () => string;
	#room: UseQueryReturn<typeof api.rooms.get>;
	#play = useMutation(api.rooms.play);
	#reset = useMutation(api.rooms.reset);

	constructor(getCode: () => string) {
		this.#getCode = getCode;
		this.#room = useQuery(api.rooms.get, () => ({ code: this.#getCode() }));
	}

	get isLoading() {
		return this.#room.isLoading;
	}

	get data() {
		return this.#room.data;
	}

	/** True once the room is found but belongs to a different game type — a room-code collision across games. */
	wrongGameType = $derived(this.data != null && this.data.gameType !== "checkers");

	#state = $derived(this.data && this.data.state.kind === "checkers" ? this.data.state : null);

	board = $derived<Board>(this.#state?.board ?? []);
	turn = $derived<PieceColor>(this.#state?.turn ?? "cyan");
	mustContinueFrom = $derived(this.#state?.mustContinueFrom ?? null);

	legalMoves = $derived(computeLegalMoves(this.board, this.turn, this.mustContinueFrom));

	/** The piece the UI treats as selected: a forced multi-jump continuation always wins over a free click. */
	effectiveSelected = $derived(this.mustContinueFrom ?? this.selected);

	myColor = $derived<PieceColor | null>(
		this.data?.myIndex === 0 ? "cyan" : this.data?.myIndex === 1 ? "pink" : null
	);
	isMyTurn = $derived(this.myColor !== null && this.myColor === this.turn);

	playerCyan = $derived(this.data?.players?.[0] ?? null);
	playerPink = $derived(this.data?.players?.[1] ?? null);

	/** Matches won by each side, persisted on the room and carried across resets. */
	scoreCyan = $derived(this.data?.scores?.[0] ?? 0);
	scorePink = $derived(this.data?.scores?.[1] ?? 0);

	/** No legal moves for the side to move means that side is out of moves or pieces — the other color wins. */
	winner = $derived<PieceColor | null>(
		this.#state !== null && this.legalMoves.length === 0
			? this.turn === "cyan"
				? "pink"
				: "cyan"
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
				await this.#move(move);
				return;
			}
		}

		if (this.mustContinueFrom !== null) return;
		this.selected = this.canSelect(index) ? index : null;
	}

	async #move(move: Move): Promise<void> {
		this.error = null;
		this.selected = null;
		try {
			await this.#play({
				code: this.#getCode(),
				move: { kind: "checkers", from: move.from, to: move.to }
			});
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}

	async reset(): Promise<void> {
		this.error = null;
		this.selected = null;
		try {
			await this.#reset({ code: this.#getCode() });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}
}
