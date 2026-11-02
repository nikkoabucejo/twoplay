import { describe, expect, test } from "vitest";
import { squareIndex } from "../../../../../convex/models/games/chess/rules.js";
import { pieceName, squareLabel } from "./labels.js";
import type { Piece } from "./types.js";

describe("squareLabel", () => {
	test("a piece that can move", () => {
		expect(
			squareLabel(squareIndex("g1"), { color: "w", type: "n" }, { isInCheck: false, canMove: true })
		).toBe("g1, white knight, can move");
	});

	test("a piece with no move this turn", () => {
		expect(
			squareLabel(
				squareIndex("a1"),
				{ color: "w", type: "r" },
				{ isInCheck: false, canMove: false }
			)
		).toBe("a1, white rook");
	});

	test("a king in check that can move", () => {
		expect(
			squareLabel(squareIndex("e8"), { color: "b", type: "k" }, { isInCheck: true, canMove: true })
		).toBe("e8, black king, in check, can move");
	});

	test("an empty square", () => {
		expect(squareLabel(squareIndex("e4"), null, { isInCheck: false, canMove: false })).toBe(
			"e4, empty"
		);
	});
});

describe("pieceName", () => {
	test("names each piece type", () => {
		const types: Piece["type"][] = ["p", "n", "b", "r", "q", "k"];
		expect(types.map(pieceName)).toEqual(["pawn", "knight", "bishop", "rook", "queen", "king"]);
	});
});
