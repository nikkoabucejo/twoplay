import { describe, expect, test } from "vitest";
import { rankOf, recentRounds, recordByGame } from "./stats.js";
import type { LeaderboardEntry } from "../../../../../convex/models/ratings/index.js";
import type {
	GameHistoryEntry,
	RoomHistoryEntry
} from "../../../../../convex/models/rooms/index.js";
import type { Id } from "../../../../../convex/_generated/dataModel.js";

function entry(name: string, isMe = false): LeaderboardEntry {
	return { userId: name as Id<"users">, name, rating: 400, isMe };
}

function game(
	round: number,
	result: GameHistoryEntry["result"],
	createdAt = round
): GameHistoryEntry {
	return { round, createdAt, result, mmr: null };
}

function room(
	code: string,
	type: RoomHistoryEntry["type"],
	games: GameHistoryEntry[]
): RoomHistoryEntry {
	return { code, type, status: "closed", opponentName: "Ana", games };
}

describe("rankOf", () => {
	test("is the 1-based position of the viewer's row", () => {
		expect(rankOf([entry("a"), entry("b"), entry("me", true), entry("c")])).toBe(3);
	});

	test("is null when the viewer is not listed", () => {
		expect(rankOf([entry("a"), entry("b")])).toBeNull();
		expect(rankOf([])).toBeNull();
	});
});

describe("recordByGame", () => {
	test("splits finished rounds by game and skips rounds in play", () => {
		const history = [
			room("AAAA", "tictactoe", [game(2, "win"), game(1, "win")]),
			room("BBBB", "checkers", [game(3, "playing"), game(2, "draw"), game(1, "loss")])
		];

		expect(recordByGame(history)).toEqual({
			tictactoe: { wins: 2, losses: 0, draws: 0 },
			checkers: { wins: 0, losses: 1, draws: 1 }
		});
	});

	test("gives every game an empty record with no history", () => {
		expect(recordByGame([])).toEqual({
			tictactoe: { wins: 0, losses: 0, draws: 0 },
			checkers: { wins: 0, losses: 0, draws: 0 }
		});
	});
});

describe("recentRounds", () => {
	const history = [
		room(
			"AAAA",
			"tictactoe",
			Array.from({ length: 7 }, (_, index) => game(7 - index, "win", 100 + 7 - index))
		),
		room(
			"BBBB",
			"checkers",
			Array.from({ length: 5 }, (_, index) => game(5 - index, "loss", 200 + 5 - index))
		)
	];

	test("caps the list at the limit, newest first", () => {
		const rounds = recentRounds(history, 10);

		expect(rounds).toHaveLength(10);
		const times = rounds.map((round) => round.createdAt);
		expect(times).toEqual([...times].sort((a, b) => b - a));
		expect(rounds[0]).toMatchObject({ type: "checkers", code: "BBBB", round: 5, result: "loss" });
	});

	test("links each round to its room and round", () => {
		const [newest] = recentRounds(history, 10);
		expect(newest.href).toBe("/checkers/BBBB/5");
		expect(newest.opponentName).toBe("Ana");
	});
});
