/** The history feed leaves the active room to the Playing card. */
export function withoutActiveRoom<T extends { code: string }>(
	rooms: readonly T[],
	activeCode: string | null | undefined
): readonly T[] {
	if (!activeCode) return rooms;
	return rooms.filter((room) => room.code !== activeCode);
}
