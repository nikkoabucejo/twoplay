import { describe, expect, test } from "vitest";
import { ACCENTS } from "./index.js";

describe("ACCENTS", () => {
	test("ACCENTS has exactly one entry per seat", () => {
		expect(ACCENTS).toHaveLength(2);
	});

	test("every accent uses its own seat's color token", () => {
		for (const value of Object.values(ACCENTS[0])) expect(value).toContain("seat-0");
		for (const value of Object.values(ACCENTS[1])) expect(value).toContain("seat-1");
	});

	test("every accent is one complete, literal tailwind class the scanner can find", () => {
		for (const accent of ACCENTS) {
			expect(accent.text).toMatch(/^text-seat-\d$/);
			expect(accent.bg).toMatch(/^bg-seat-\d$/);
			expect(accent.winBg).toMatch(/^bg-seat-\d\/\d+$/);
			expect(accent.tintBg).toMatch(/^bg-seat-\d\/\d+$/);
			expect(accent.ring).toMatch(/^ring-seat-\d$/);
		}
	});

	test("the win highlight is stronger than the background tint", () => {
		const opacity = (cls: string) => Number(cls.split("/")[1]);
		for (const accent of ACCENTS) {
			expect(opacity(accent.winBg)).toBeGreaterThan(opacity(accent.tintBg));
		}
	});
});
