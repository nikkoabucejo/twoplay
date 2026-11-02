export function splitPodium<T>(entries: readonly T[]): { podium: T[]; rest: T[] } {
	return { podium: entries.slice(0, 3), rest: entries.slice(3) };
}

/** The viewer's place on the leaderboard. `rank` is 1-based, or null when they aren't listed. */
export function rankStatus({
	rank,
	totalGames,
	listLength
}: {
	rank: number | null;
	totalGames: number;
	listLength: number;
}): string {
	if (rank !== null) return `Rank #${rank} of ${listLength}`;
	if (totalGames === 0) return "Finish a game to get ranked";
	return `Not in the top ${listLength}`;
}
