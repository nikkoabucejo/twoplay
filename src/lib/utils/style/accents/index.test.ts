import { describe, expect, test } from "vitest";
import { ACCENTS } from "./index.js";

describe("ACCENTS", () => {
	test("ACCENTS has exactly one entry per seat", () => {
		expect(ACCENTS).toHaveLength(2);
	});

	test("seat 0 is cyan and seat 1 is pink across every accent", () => {
		for (const value of Object.values(ACCENTS[0])) expect(value).toContain("cyan-500");
		for (const value of Object.values(ACCENTS[1])) expect(value).toContain("pink-500");
	});

	test("every accent is one complete, literal tailwind class the scanner can find", () => {
		for (const accent of ACCENTS) {
			expect(accent.text).toMatch(/^text-[a-z]+-\d{3}$/);
			expect(accent.bg).toMatch(/^bg-[a-z]+-\d{3}$/);
			expect(accent.winBg).toMatch(/^bg-[a-z]+-\d{3}\/\d+$/);
			expect(accent.tintBg).toMatch(/^bg-[a-z]+-\d{3}\/\d+$/);
		}
	});

	test("the win highlight is stronger than the background tint", () => {
		const opacity = (cls: string) => Number(cls.split("/")[1]);
		for (const accent of ACCENTS) {
			expect(opacity(accent.winBg)).toBeGreaterThan(opacity(accent.tintBg));
		}
	});
});
