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
	{
		ability,
		isSelected,
		isDestination
	}: { ability: "capture" | "move" | null; isSelected: boolean; isDestination: boolean }
): string {
	return [
		squareName(index),
		piece ? `${piece.color} ${piece.king ? "king" : "man"}` : "empty",
		...(ability !== null && !isSelected ? [`can ${ability}`] : []),
		...(isSelected ? ["selected"] : []),
		...(isDestination ? ["move here"] : [])
	].join(", ");
}
