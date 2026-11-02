import type { Cell } from "./types.js";

/** The nine mini-boards' positions, row by row. */
export const BOARD_POSITIONS = [
	"top left",
	"top center",
	"top right",
	"middle left",
	"center",
	"middle right",
	"bottom left",
	"bottom center",
	"bottom right"
] as const;

export function boardLabel(boardIndex: number): string {
	return `Board ${boardIndex + 1} (${BOARD_POSITIONS[boardIndex]})`;
}

/** `isPlayable`: the viewer may play this cell now. */
export function cellLabel(
	boardIndex: number,
	cellIndex: number,
	cell: Cell,
	isPlayable: boolean
): string {
	const content = cell ?? (isPlayable ? "empty, playable" : "empty");
	return `${boardLabel(boardIndex)}, cell ${cellIndex + 1} — ${content}`;
}
