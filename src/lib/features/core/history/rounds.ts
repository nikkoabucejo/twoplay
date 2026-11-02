import type {
	GameHistoryEntry,
	RoomHistoryEntry
} from "../../../../../convex/models/rooms/index.js";

export type EndReason = "timeout" | "resign" | "abandon";

/** History entries gain an optional `reason` in a later server change. Reading it through this
 *  widening compiles with and without that field. */
type RoomWithReasons = Pick<RoomHistoryEntry, "code" | "type" | "opponentName"> & {
	games: readonly (GameHistoryEntry & { reason?: EndReason | null })[];
};

export type HistoryRound = Pick<RoomHistoryEntry, "code" | "type" | "opponentName"> &
	GameHistoryEntry & { reason: EndReason | null };

export type HistoryDay = { label: string; rounds: HistoryRound[] };

const REASON_LABELS: Record<EndReason, string> = {
	timeout: "Timeout",
	resign: "Resigned",
	abandon: "Abandoned"
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function toRounds(rooms: readonly RoomWithReasons[]): HistoryRound[] {
	return rooms
		.flatMap((room) =>
			room.games.map((game) => ({
				code: room.code,
				type: room.type,
				opponentName: room.opponentName,
				round: game.round,
				createdAt: game.createdAt,
				result: game.result,
				mmr: game.mmr,
				reason: game.reason ?? null
			}))
		)
		.sort((a, b) => b.createdAt - a.createdAt);
}

export function reasonLabel(reason: EndReason | null): string | null {
	return reason === null ? null : REASON_LABELS[reason];
}

function startOfDay(time: number): number {
	const date = new Date(time);
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(time: number, now: number): string {
	// Rounded, since a day across a daylight-saving change is 23 or 25 hours long.
	const daysAgo = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
	if (daysAgo <= 0) return "Today";
	if (daysAgo === 1) return "Yesterday";
	const isThisYear = new Date(time).getFullYear() === new Date(now).getFullYear();
	return new Date(time).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: isThisYear ? undefined : "numeric"
	});
}

/** Groups rounds, already newest first, under their local calendar day. */
export function groupByDay(rounds: readonly HistoryRound[], now: number): HistoryDay[] {
	const days: HistoryDay[] = [];
	for (const round of rounds) {
		const label = dayLabel(round.createdAt, now);
		const last = days.at(-1);
		if (last?.label === label) last.rounds.push(round);
		else days.push({ label, rounds: [round] });
	}
	return days;
}

/** A floor-clamped loss settles at 0, which shows as "0" rather than "-0". */
export function formatRatingChange(mmr: number | null): string | null {
	if (mmr === null) return null;
	if (mmr > 0) return `+${mmr}`;
	if (mmr < 0) return `−${Math.abs(mmr)}`;
	return "0";
}
