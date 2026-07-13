/**
 * The two seats' shared color identity. Kept as complete, literal Tailwind class names —
 * Tailwind's scanner only generates CSS for class strings it finds verbatim in source, so these
 * must never be built by concatenating fragments at runtime (the bug this replaces, see Board's
 * `dotClass`, worked around it by string-replacing `text-` with `bg-`, which breaks on multi-class
 * accents like `dark:` variants).
 */
export const ACCENTS: readonly { text: string; bg: string; winBg: string; tintBg: string }[] = [
	{ text: "text-cyan-500", bg: "bg-cyan-500", winBg: "bg-cyan-500/25", tintBg: "bg-cyan-500/10" },
	{ text: "text-pink-500", bg: "bg-pink-500", winBg: "bg-pink-500/25", tintBg: "bg-pink-500/10" }
];
