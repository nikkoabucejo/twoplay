export type SectionTop = { id: string; top: number };

/**
 * The section being read: the last one whose top has passed `line` (measured from the top of the
 * scroll area), or the last section once the area can't scroll further, since short closing
 * sections never reach the line.
 */
export function activeSection(
	sections: readonly SectionTop[],
	line: number,
	isAtEnd: boolean
): string | null {
	if (sections.length === 0) return null;
	if (isAtEnd) return sections[sections.length - 1].id;
	let active = sections[0].id;
	for (const section of sections) if (section.top <= line) active = section.id;
	return active;
}

/** The section a URL hash names, if it is one of these. */
export function sectionFromHash(hash: string, ids: readonly string[]): string | null {
	const id = decodeURIComponent(hash.replace(/^#/, ""));
	return ids.includes(id) ? id : null;
}
