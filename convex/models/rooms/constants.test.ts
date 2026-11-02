import { describe, expect, test } from "vitest";
import { DEFAULT_TIME_CONTROL_MS, resolveTimeControlMs } from "./constants.js";

describe("DEFAULT_TIME_CONTROL_MS", () => {
	test("is five minutes", () => {
		expect(DEFAULT_TIME_CONTROL_MS).toBe(5 * 60_000);
	});
});

describe("resolveTimeControlMs", () => {
	test("a missing or non-finite time falls back to five minutes", () => {
		expect(resolveTimeControlMs(undefined)).toBe(5 * 60_000);
		expect(resolveTimeControlMs(NaN)).toBe(5 * 60_000);
	});

	test("clamps to 10 seconds and 60 minutes", () => {
		expect(resolveTimeControlMs(1_000)).toBe(10_000);
		expect(resolveTimeControlMs(2 * 60 * 60_000)).toBe(60 * 60_000);
	});

	test("keeps a time inside the range", () => {
		expect(resolveTimeControlMs(90_000)).toBe(90_000);
	});
});
