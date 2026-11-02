import { isHttpError } from "@sveltejs/kit";
import { describe, expect, test } from "vitest";
import { load } from "./+page.js";

function loadGame(game: string) {
	return load({ params: { game } } as Parameters<typeof load>[0]);
}

describe("load", () => {
	test("returns each known game", () => {
		expect(loadGame("tictactoe")).toEqual({ game: "tictactoe" });
		expect(loadGame("checkers")).toEqual({ game: "checkers" });
	});

	test("throws a 404 for an unknown game", () => {
		let thrown: unknown;
		try {
			loadGame("backgammon");
		} catch (caught) {
			thrown = caught;
		}
		expect(isHttpError(thrown, 404)).toBe(true);
	});
});
