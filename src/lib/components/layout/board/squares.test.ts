import { describe, expect, test } from "vitest";
import { MOVE_DOT, SELECTED_RING, SQUARE_FOCUS, squareClass } from "./squares.js";

function classesOf(value: string): string[] {
	return value.split(" ");
}

describe("squareClass", () => {
	test("a light square is the background color", () => {
		expect(classesOf(squareClass({ dark: false }))).toContain("bg-background");
	});

	test("a dark square is the foreground tint", () => {
		expect(classesOf(squareClass({ dark: true }))).toContain("bg-foreground/15");
	});

	test("the last-move tint replaces the base color", () => {
		const classes = classesOf(squareClass({ dark: true, tint: 1 }));
		expect(classes).toContain("bg-seat-1/10");
		expect(classes).not.toContain("bg-foreground/15");
	});

	test("seat 0's tint replaces a light base", () => {
		const classes = classesOf(squareClass({ dark: false, tint: 0 }));
		expect(classes).toContain("bg-seat-0/10");
		expect(classes).not.toContain("bg-background");
	});

	test("the check mark replaces both the base color and the tint", () => {
		const classes = classesOf(squareClass({ dark: true, tint: 0, mark: true }));
		expect(classes).toContain("bg-destructive/20");
		expect(classes).not.toContain("bg-foreground/15");
		expect(classes).not.toContain("bg-seat-0/10");
	});

	test("an interactive square carries the focus ring", () => {
		expect(squareClass({ dark: true, interactive: true })).toContain(SQUARE_FOCUS);
	});

	test("a picture square has no focus ring", () => {
		expect(squareClass({ dark: true })).not.toContain("focus-visible:");
	});

	test("no square has a hover background", () => {
		expect(squareClass({ dark: true, tint: 0, mark: true, interactive: true })).not.toMatch(
			/hover:/
		);
	});
});

describe("square marks", () => {
	test("the selected ring is a white ring without placement", () => {
		expect(SELECTED_RING).toBe("rounded-full ring-2 ring-white");
	});

	test("the move dot is a quarter-size emerald dot", () => {
		expect(MOVE_DOT).toBe("absolute size-1/4 rounded-full bg-emerald-400/70");
	});
});
