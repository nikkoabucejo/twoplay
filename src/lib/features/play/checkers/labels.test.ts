import { describe, expect, test } from "vitest";
import { idx } from "../../../../../convex/models/games/checkers/rules.js";
import { squareLabel, squareName } from "./labels.js";

describe("squareName", () => {
	test("files run a to h left to right and ranks 1 to 8 up from seat 0's side", () => {
		expect(squareName(idx(7, 0))).toBe("a1");
		expect(squareName(idx(5, 4))).toBe("e3");
		expect(squareName(idx(0, 7))).toBe("h8");
	});
});

describe("squareLabel", () => {
	test("a king that can capture", () => {
		expect(
			squareLabel(
				idx(5, 4),
				{ color: "cyan", king: true },
				{ ability: "capture", isSelected: false, isDestination: false }
			)
		).toBe("e3, cyan king, can capture");
	});

	test("a man that can move", () => {
		expect(
			squareLabel(
				idx(2, 1),
				{ color: "pink", king: false },
				{ ability: "move", isSelected: false, isDestination: false }
			)
		).toBe("b6, pink man, can move");
	});

	test("a piece with no move this turn", () => {
		expect(
			squareLabel(
				idx(7, 0),
				{ color: "cyan", king: false },
				{ ability: null, isSelected: false, isDestination: false }
			)
		).toBe("a1, cyan man");
	});

	test("an empty square", () => {
		expect(
			squareLabel(idx(4, 3), null, { ability: null, isSelected: false, isDestination: false })
		).toBe("d4, empty");
	});

	test("the selected piece says selected instead of its ability", () => {
		expect(
			squareLabel(
				idx(5, 0),
				{ color: "cyan", king: false },
				{ ability: "move", isSelected: true, isDestination: false }
			)
		).toBe("a3, cyan man, selected");
	});

	test("an empty destination says move here", () => {
		expect(
			squareLabel(idx(4, 1), null, { ability: null, isSelected: false, isDestination: true })
		).toBe("b4, empty, move here");
	});
});
