import { rc } from "../../../../../convex/models/games/checkers/rules.js";
import type { Square } from "./types.js";

/** The coordinate from seat 0's side, whichever way the board is drawn. */
export function squareName(index: number): string {
	const [row, col] = rc(index);
	return `${"abcdefgh"[col]}${8 - row}`;
}

export function squareLabel(
	index: number,
	piece: Square,
	ability: "capture" | "move" | null
): string {
	const name = squareName(index);
	if (!piece) return `${name}, empty`;
	const label = `${name}, ${piece.color} ${piece.king ? "king" : "man"}`;
	return ability === null ? label : `${label}, can ${ability}`;
}
