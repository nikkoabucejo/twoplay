import { describe, expect, test } from "vitest";
import { otherPlayer, playerSymbols } from "./engine.js";

describe("playerSymbols", () => {
	const symbols = playerSymbols(["X", "O"] as const);

	test("maps the first symbol to player 0 and the second to player 1", () => {
		expect(symbols.indexOf("X")).toBe(0);
		expect(symbols.indexOf("O")).toBe(1);
	});

	test("maps player 0 to the first symbol and player 1 to the second", () => {
		expect(symbols.symbolOf(0)).toBe("X");
		expect(symbols.symbolOf(1)).toBe("O");
	});
});

describe("otherPlayer", () => {
	test("returns the opposite seat", () => {
		expect(otherPlayer(0)).toBe(1);
		expect(otherPlayer(1)).toBe(0);
	});
});
