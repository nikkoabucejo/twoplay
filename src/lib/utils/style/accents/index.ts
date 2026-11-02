/**
 * The two seats' shared color identity. Kept as complete, literal Tailwind class names —
 * Tailwind's scanner only generates CSS for class strings it finds verbatim in source, so these
 * must never be built by concatenating fragments at runtime (the bug this replaces, see Board's
 * `dotClass`, worked around it by string-replacing `text-` with `bg-`, which breaks on multi-class
 * accents like `dark:` variants).
 */
export const ACCENTS: readonly {
	text: string;
	bg: string;
	winBg: string;
	tintBg: string;
	ring: string;
}[] = [
	{
		text: "text-seat-0",
		bg: "bg-seat-0",
		winBg: "bg-seat-0/25",
		tintBg: "bg-seat-0/10",
		ring: "ring-seat-0"
	},
	{
		text: "text-seat-1",
		bg: "bg-seat-1",
		winBg: "bg-seat-1/25",
		tintBg: "bg-seat-1/10",
		ring: "ring-seat-1"
	}
];
