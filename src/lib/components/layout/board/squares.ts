import { ACCENTS, cn } from "$lib/utils/style";

/** The focus ring on a square that takes input. */
export const SQUARE_FOCUS =
	"outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset";

/** The selected piece's ring. Each board places it with its own inset. */
export const SELECTED_RING = "rounded-full ring-2 ring-white";

/** The dot on an empty square a selected piece can move to. */
export const MOVE_DOT = "absolute size-1/4 rounded-full bg-emerald-400/70";

/**
 * A chess or checkers square. Later backgrounds win: the last-move tint over the base color, the
 * mark over the tint.
 */
export function squareClass({
	dark,
	tint = null,
	mark = false,
	interactive = false
}: {
	dark: boolean;
	/** The seat that made the last move, when this square is its from or to square. */
	tint?: 0 | 1 | null;
	/** The king in check. */
	mark?: boolean;
	/** Adds the focus ring. Picture-mode squares leave it off. */
	interactive?: boolean;
}): string {
	return cn(
		"relative flex items-center justify-center",
		dark ? "bg-foreground/15" : "bg-background",
		tint !== null && ACCENTS[tint].tintBg,
		mark && "bg-destructive/20",
		interactive && SQUARE_FOCUS
	);
}
