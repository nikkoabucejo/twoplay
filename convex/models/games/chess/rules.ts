import { Chess, SQUARES } from "chess.js";
import type { Infer } from "convex/values";
import { playerSymbols } from "../engine.js";
import type { chessMove, chessState } from "./schema.js";

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PromotionPiece = NonNullable<Infer<typeof chessMove>["promotion"]>;
export type Piece = { color: Color; type: PieceType };
export type Square =
	`${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
export type LegalMove = { from: Square; to: Square; promotion?: PromotionPiece; san: string };
export type Outcome =
	"checkmate" | "stalemate" | "insufficient" | "repetition" | "fifty-move" | null;
export type Position = Omit<Infer<typeof chessState>, "kind">;
type MoveRequest = Omit<Infer<typeof chessMove>, "kind">;

const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

export const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** The only place a side's color is read as, or built from, a seat. */
export const { indexOf: seatOfColor, symbolOf: colorOfSeat } = playerSymbols<Color>(["w", "b"]);

export function initialPosition(): Position {
	return { fen: INITIAL_FEN, positions: [positionKey(INITIAL_FEN)] };
}

/** 64 squares, row-major from a8 (index 0) to h1 (63): white's view, top to bottom. */
export function boardOf(fen: string): (Piece | null)[] {
	return new Chess(fen)
		.board()
		.flat()
		.map((square) => square && { color: square.color, type: square.type });
}

export function squareName(index: number): Square {
	return SQUARES[index];
}

export function squareIndex(square: Square): number {
	return SQUARES.indexOf(square);
}

export function turnOf(fen: string): Color {
	return new Chess(fen).turn();
}

export function isCheck(fen: string): boolean {
	return new Chess(fen).inCheck();
}

/** The square of the king to move when it is in check, else null. */
export function checkedKing(fen: string): Square | null {
	const chess = new Chess(fen);
	if (!chess.inCheck()) return null;
	const [king] = chess.findPiece({ type: "k", color: chess.turn() });
	return king;
}

export function legalMoves(fen: string): LegalMove[] {
	return new Chess(fen).moves({ verbose: true }).map(({ from, to, promotion, san }) => {
		const piece = PROMOTION_PIECES.find((candidate) => candidate === promotion);
		return piece ? { from, to, promotion: piece, san } : { from, to, san };
	});
}

/** Whether `move` takes a piece. SAN marks every capture, en passant included, with `x`. */
export function isCapture(move: LegalMove): boolean {
	return move.san.includes("x");
}

/** Whether a legal move from `from` to `to` needs a promotion piece. */
export function isPromotion(fen: string, from: Square, to: Square): boolean {
	return legalMoves(fen).some(
		(move) => move.from === from && move.to === to && move.promotion !== undefined
	);
}

function isSquare(text: string): text is Square {
	return /^[a-h][1-8]$/.test(text);
}

/** The position after `move`, or null when it is illegal. The promotion piece must match exactly:
 *  chess.js would ignore one sent with an ordinary move, and pick a default when it is missing. */
export function play(position: Position, move: MoveRequest): Position | null {
	if (!isSquare(move.from) || !isSquare(move.to)) return null;
	const chess = new Chess(position.fen);
	const legal = chess
		.moves({ verbose: true })
		.find(
			({ from, to, promotion }) =>
				from === move.from && to === move.to && promotion === move.promotion
		);
	if (!legal) return null;

	const played = chess.move({ from: legal.from, to: legal.to, promotion: legal.promotion });
	const fen = chess.fen();
	const key = positionKey(fen);
	const isIrreversible = played.captured !== undefined || played.piece === "p";
	return { fen, positions: isIrreversible ? [key] : [...position.positions, key] };
}

/** How the position ends, or null while play goes on. Checkmate comes first, so a mate on the
 *  hundredth quiet half-move still wins. */
export function outcome({ fen, positions }: Position): Outcome {
	const chess = new Chess(fen);
	if (chess.isCheckmate()) return "checkmate";
	if (chess.isStalemate()) return "stalemate";
	if (chess.isInsufficientMaterial()) return "insufficient";
	const key = positionKey(fen);
	if (positions.filter((position) => position === key).length >= 3) return "repetition";
	if (Number(fen.split(" ")[4]) >= 100) return "fifty-move";
	return null;
}

/** The FEN's placement, side to move, castling rights, and en passant square, with the en passant
 *  square kept only when a capture there is legal, so positions that differ by it alone still match. */
export function positionKey(fen: string): string {
	const fields = fen.split(" ");
	const canCaptureEnPassant = new Chess(fen)
		.moves({ verbose: true })
		.some((move) => move.isEnPassant());
	return [...fields.slice(0, 3), canCaptureEnPassant ? fields[3] : "-"].join(" ");
}

/** The legal move that turns `beforeFen` into `afterFen`, or null when no single move does. */
export function findMove(beforeFen: string, afterFen: string): LegalMove | null {
	return (
		legalMoves(beforeFen).find((move) => {
			const chess = new Chess(beforeFen);
			chess.move({ from: move.from, to: move.to, promotion: move.promotion });
			return chess.fen() === afterFen;
		}) ?? null
	);
}
