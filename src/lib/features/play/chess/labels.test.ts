import { describe, expect, test } from "vitest";
import { squareIndex } from "../../../../../convex/models/games/chess/rules.js";
import { pieceName, squareLabel } from "./labels.js";
import type { Piece } from "./types.js";

describe("squareLabel", () => {
	test("a piece that can move", () => {
		expect(
			squareLabel(
				squareIndex("g1"),
				{ color: "w", type: "n" },
				{ isInCheck: false, canMove: true, isSelected: false, isDestination: false }
			)
		).toBe("g1, white knight, can move");
	});

	test("a piece with no move this turn", () => {
		expect(
			squareLabel(
				squareIndex("a1"),
				{ color: "w", type: "r" },
				{ isInCheck: false, canMove: false, isSelected: false, isDestination: false }
			)
		).toBe("a1, white rook");
	});

	test("a king in check that can move", () => {
		expect(
			squareLabel(
				squareIndex("e8"),
				{ color: "b", type: "k" },
				{ isInCheck: true, canMove: true, isSelected: false, isDestination: false }
			)
		).toBe("e8, black king, in check, can move");
	});

	test("an empty square", () => {
		expect(
			squareLabel(squareIndex("e4"), null, {
				isInCheck: false,
				canMove: false,
				isSelected: false,
				isDestination: false
			})
		).toBe("e4, empty");
	});

	test("the selected piece says selected instead of can move", () => {
		expect(
			squareLabel(
				squareIndex("g1"),
				{ color: "w", type: "n" },
				{ isInCheck: false, canMove: true, isSelected: true, isDestination: false }
			)
		).toBe("g1, white knight, selected");
	});

	test("an empty destination says move here", () => {
		expect(
			squareLabel(squareIndex("f3"), null, {
				isInCheck: false,
				canMove: false,
				isSelected: false,
				isDestination: true
			})
		).toBe("f3, empty, move here");
	});

	test("a capture destination names the captured piece, then move here", () => {
		expect(
			squareLabel(
				squareIndex("d5"),
				{ color: "b", type: "p" },
				{ isInCheck: false, canMove: false, isSelected: false, isDestination: true }
			)
		).toBe("d5, black pawn, move here");
	});

	test("a selected king in check keeps in check", () => {
		expect(
			squareLabel(
				squareIndex("e8"),
				{ color: "b", type: "k" },
				{ isInCheck: true, canMove: true, isSelected: true, isDestination: false }
			)
		).toBe("e8, black king, in check, selected");
	});
});

describe("pieceName", () => {
	test("names each piece type", () => {
		const types: Piece["type"][] = ["p", "n", "b", "r", "q", "k"];
		expect(types.map(pieceName)).toEqual(["pawn", "knight", "bishop", "rook", "queen", "king"]);
	});
});
