import { GAME_TYPES } from "$lib/features/play";
import type { GameType } from "../../../../../convex/models/games/index.js";
import type { LeaderboardEntry } from "../../../../../convex/models/ratings/index.js";
import type {
	GameHistoryEntry,
	RoomHistoryEntry
} from "../../../../../convex/models/rooms/index.js";

export type GameRecord = { wins: number; losses: number; draws: number };

export type RecentRound = GameHistoryEntry & {
	type: GameType;
	code: string;
	opponentName: string | null;
	href: string;
};

/** 1-based leaderboard position, or null when the viewer is outside the listed rows. */
export function rankOf(top: LeaderboardEntry[]) {
	const index = top.findIndex((row) => row.isMe);
	return index === -1 ? null : index + 1;
}

export function recordByGame(history: RoomHistoryEntry[]) {
	const records = Object.fromEntries(
		GAME_TYPES.map((type) => [type, { wins: 0, losses: 0, draws: 0 }])
	) as Record<GameType, GameRecord>;

	for (const room of history) {
		const record = records[room.type];
		for (const game of room.games) {
			if (game.result === "win") record.wins += 1;
			else if (game.result === "loss") record.losses += 1;
			else if (game.result === "draw") record.draws += 1;
		}
	}
	return records;
}

export function recentRounds(history: RoomHistoryEntry[], limit: number): RecentRound[] {
	return history
		.flatMap((room) =>
			room.games.map((game) => ({
				...game,
				type: room.type,
				code: room.code,
				opponentName: room.opponentName,
				href: `/${room.type}/${room.code}/${game.round}`
			}))
		)
		.sort((a, b) => b.createdAt - a.createdAt)
		.slice(0, limit);
}
