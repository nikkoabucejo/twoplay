/** Splits the feed around the Playing slot. The active room is left out of both, to the Playing
 *  card. A room that was active earlier in this page view finished while the page was open, so it is
 *  held in the Playing slot instead of being inserted above the list. Both keep the history's order,
 *  newest first. */
export function splitHistory<T extends { code: string }>(
	rooms: readonly T[],
	activeCode: string | null | undefined,
	seenActiveCodes: ReadonlySet<string>
): { list: T[]; held: T[] } {
	const list: T[] = [];
	const held: T[] = [];
	for (const room of rooms) {
		if (room.code === activeCode) continue;
		if (seenActiveCodes.has(room.code)) held.push(room);
		else list.push(room);
	}
	return { list, held };
}
