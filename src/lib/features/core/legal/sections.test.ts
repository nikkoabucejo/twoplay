import { describe, expect, test } from "vitest";
import { activeSection, sectionFromHash } from "./sections.js";

const SECTIONS = [
	{ id: "sign-in", top: -400 },
	{ id: "stored", top: 120 },
	{ id: "settings", top: 500 },
	{ id: "no-ads", top: 800 }
];

describe("activeSection", () => {
	test("is the last section whose top has passed the line", () => {
		expect(activeSection(SECTIONS, 200, false)).toBe("stored");
		expect(activeSection(SECTIONS, 100, false)).toBe("sign-in");
	});

	test("is the first section before any has reached the line", () => {
		expect(activeSection([{ id: "a", top: 300 }], 200, false)).toBe("a");
	});

	test("is the last section once the page can't scroll further", () => {
		expect(activeSection(SECTIONS, 200, true)).toBe("no-ads");
	});

	test("is null with no sections", () => {
		expect(activeSection([], 200, false)).toBeNull();
	});
});

describe("sectionFromHash", () => {
	test("names a known section", () => {
		expect(sectionFromHash("#stored", ["sign-in", "stored"])).toBe("stored");
	});

	test("ignores an empty or unknown hash", () => {
		expect(sectionFromHash("", ["sign-in"])).toBeNull();
		expect(sectionFromHash("#elsewhere", ["sign-in"])).toBeNull();
	});
});
