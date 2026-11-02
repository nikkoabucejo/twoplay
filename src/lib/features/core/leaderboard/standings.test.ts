import { describe, expect, test } from "vitest";
import { rankStatus, splitPodium } from "./standings.js";

const players = ["Ada", "Bob", "Cy", "Dee", "Eve"].map((name) => ({ name }));

describe("splitPodium", () => {
	test("puts the first three on the podium and the rest after it", () => {
		expect(splitPodium(players)).toEqual({
			podium: players.slice(0, 3),
			rest: players.slice(3)
		});
	});

	test("puts a lone player on the podium with nothing after it", () => {
		expect(splitPodium(players.slice(0, 1))).toEqual({ podium: players.slice(0, 1), rest: [] });
	});
});

describe("rankStatus", () => {
	test("gives the rank and the list's length when ranked", () => {
		expect(rankStatus({ rank: 4, totalGames: 12, listLength: 40 })).toBe("Rank #4 of 40");
	});

	test("says not in the top list after finished games", () => {
		expect(rankStatus({ rank: null, totalGames: 3, listLength: 100 })).toBe("Not in the top 100");
	});

	test("asks a player with no finished games to finish one", () => {
		expect(rankStatus({ rank: null, totalGames: 0, listLength: 100 })).toBe(
			"Finish a game to get ranked"
		);
	});
});
