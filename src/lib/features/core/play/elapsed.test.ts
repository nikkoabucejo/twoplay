import { describe, expect, test } from "vitest";
import { formatElapsed } from "./elapsed.js";

describe("formatElapsed", () => {
	test("formats 75 seconds as 01:15", () => {
		expect(formatElapsed(75_000)).toBe("01:15");
	});

	test("formats zero as 00:00", () => {
		expect(formatElapsed(0)).toBe("00:00");
	});

	test("drops partial seconds", () => {
		expect(formatElapsed(59_999)).toBe("00:59");
	});
});
