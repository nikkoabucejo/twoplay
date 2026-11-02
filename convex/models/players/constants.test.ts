import { describe, expect, test } from "vitest";
import { DEFAULT_EMOJI, TRASHTALK_EMOJIS } from "./constants.js";

describe("DEFAULT_EMOJI", () => {
	test("is the grinning face", () => {
		expect(DEFAULT_EMOJI).toBe("1f600");
	});
});

describe("TRASHTALK_EMOJIS", () => {
	test("is the default plus the picker's ten codepoints", () => {
		expect(TRASHTALK_EMOJIS).toContain(DEFAULT_EMOJI);
		expect(TRASHTALK_EMOJIS).toEqual([
			"1f600",
			"1f602",
			"1f60f",
			"1f440",
			"1f525",
			"1f480",
			"1f921",
			"1f60e",
			"1f4aa",
			"1f4af",
			"1f37f"
		]);
	});
});
