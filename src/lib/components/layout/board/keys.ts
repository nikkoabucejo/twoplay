import type { GameType } from "../../../../../convex/models/games/index.js";

export type ScrubCommand = "back" | "forward" | "first" | "live";

const ARROW_COMMANDS: Record<string, ScrubCommand> = {
	ArrowLeft: "back",
	ArrowRight: "forward",
	ArrowDown: "first",
	ArrowUp: "live"
};

/** Arrows scrub only from outside the board, where they don't move focus between squares. */
export function scrubCommand(
	key: string,
	{ isInBoard, isTextField }: { isInBoard: boolean; isTextField: boolean }
): ScrubCommand | null {
	if (isTextField) return null;
	if (key === "[") return "back";
	if (key === "]") return "forward";
	return isInBoard ? null : (ARROW_COMMANDS[key] ?? null);
}

const STEPS: Record<string, [row: number, col: number]> = {
	ArrowUp: [-1, 0],
	ArrowDown: [1, 0],
	ArrowLeft: [0, -1],
	ArrowRight: [0, 1]
};

/** Tic-tac-toe slots are `board * 9 + cell` in DOM order, laid out on screen as one 9x9 grid. */
function tictactoeStep(slot: number, [dRow, dCol]: [number, number]): number {
	const board = Math.floor(slot / 9);
	const cell = slot % 9;
	const row = Math.floor(board / 3) * 3 + Math.floor(cell / 3) + dRow;
	const col = (board % 3) * 3 + (cell % 3) + dCol;
	if (row < 0 || row > 8 || col < 0 || col > 8) return slot;
	return (Math.floor(row / 3) * 3 + Math.floor(col / 3)) * 9 + (row % 3) * 3 + (col % 3);
}

/** Checkers slots are the 64 squares in DOM order. Only the dark ones are stops, so a sideways step
 *  skips a column, and a vertical one leans right, or left at the right edge. */
function checkersStep(slot: number, [dRow, dCol]: [number, number]): number {
	const row = Math.floor(slot / 8) + dRow;
	const col = slot % 8;
	if (row < 0 || row > 7) return slot;
	if (dRow !== 0) return row * 8 + (col === 7 ? 6 : col + 1);
	const nextCol = col + dCol * 2;
	return nextCol < 0 || nextCol > 7 ? slot : row * 8 + nextCol;
}

/** Chess slots are the 64 squares in DOM order, all of them stops. */
function chessStep(slot: number, [dRow, dCol]: [number, number]): number {
	const row = Math.floor(slot / 8) + dRow;
	const col = (slot % 8) + dCol;
	return row < 0 || row > 7 || col < 0 || col > 7 ? slot : row * 8 + col;
}

const FIRST_AND_LAST: Record<GameType, [number, number]> = {
	tictactoe: [0, 80],
	checkers: [1, 62],
	chess: [0, 63]
};

/** The slot focus moves to on `key`, the same slot at an edge, or null for a key that doesn't move
 *  focus. */
export function rovingStep(slot: number, key: string, layout: GameType): number | null {
	if (key === "Home") return FIRST_AND_LAST[layout][0];
	if (key === "End") return FIRST_AND_LAST[layout][1];
	const step = STEPS[key];
	if (!step) return null;
	switch (layout) {
		case "tictactoe":
			return tictactoeStep(slot, step);
		case "checkers":
			return checkersStep(slot, step);
		case "chess":
			return chessStep(slot, step);
	}
}
