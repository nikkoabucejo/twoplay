import { squareName } from "../../../../../convex/models/games/chess/rules.js";
import type { Piece } from "./types.js";

const COLOR_NAMES: Record<Piece["color"], string> = { w: "white", b: "black" };
const TYPE_NAMES: Record<Piece["type"], string> = {
	p: "pawn",
	n: "knight",
	b: "bishop",
	r: "rook",
	q: "queen",
	k: "king"
};

export function pieceName(type: Piece["type"]): string {
	return TYPE_NAMES[type];
}

export function squareLabel(
	index: number,
	piece: Piece | null,
	{ isInCheck, canMove }: { isInCheck: boolean; canMove: boolean }
): string {
	const name = squareName(index);
	if (!piece) return `${name}, empty`;
	return [
		`${name}, ${COLOR_NAMES[piece.color]} ${pieceName(piece.type)}`,
		...(isInCheck ? ["in check"] : []),
		...(canMove ? ["can move"] : [])
	].join(", ");
}
