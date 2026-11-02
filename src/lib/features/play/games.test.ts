import { describe, expect, test } from "vitest";
import { gameEngines, gameTypeValidator } from "../../../../convex/models/games/index.js";
import { SEAT_COLORS } from "$lib/utils/style";
import { GAME_TYPES, GAMES } from "./games.js";

describe("GAMES", () => {
	test("has an entry for every game the server registers, and no others", () => {
		expect(Object.keys(GAMES).sort()).toEqual(Object.keys(gameEngines).sort());
	});

	test("gives every game a display name and an icon", () => {
		for (const meta of Object.values(GAMES)) {
			expect(meta.name).not.toBe("");
			expect(meta.icon).toBeTypeOf("function");
		}
	});

	test("names chess and describes it in one sentence", () => {
		expect(GAMES.chess.name).toBe("Chess");
		expect(GAMES.chess.description).toBe("Checkmate the king to win.");
	});

	test("never shows two games under the same name", () => {
		const names = Object.values(GAMES).map((meta) => meta.name);
		expect(new Set(names).size).toBe(names.length);
	});

	test("uses the seat colors, in seat order, for every game", () => {
		for (const meta of Object.values(GAMES)) {
			expect(meta.colors).toEqual(SEAT_COLORS);
		}
	});
});

describe("GAME_TYPES", () => {
	test("lists the same games as the server's game-type validator", () => {
		const validatorTypes = gameTypeValidator.members.map((member) => member.value);
		expect([...GAME_TYPES].sort()).toEqual(validatorTypes.sort());
	});
});
