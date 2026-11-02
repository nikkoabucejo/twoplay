import { describe, expect, test } from "vitest";
import { cn, tv } from "./index.js";

describe("cn", () => {
	test("keeps the last of two conflicting tailwind classes", () => {
		expect(cn("p-2", "p-4")).toBe("p-4");
	});

	test("keeps classes that don't conflict", () => {
		expect(cn("p-2", "text-sm")).toBe("p-2 text-sm");
	});

	test("drops falsy entries so conditional classes can be inlined", () => {
		expect(cn("p-2", false, null, undefined, "", "text-sm")).toBe("p-2 text-sm");
	});

	test("accepts clsx-style arrays and objects", () => {
		expect(cn(["p-2", { "text-sm": true, hidden: false }])).toBe("p-2 text-sm");
	});

	test("keeps text-caption next to a text color", () => {
		expect(cn("text-caption", "text-emerald-500")).toBe("text-caption text-emerald-500");
	});

	test("treats text-caption as a font size", () => {
		expect(cn("text-sm", "text-caption")).toBe("text-caption");
	});

	test("resolves conflicts within the same variant only", () => {
		expect(cn("hover:bg-cyan-500 bg-pink-500", "hover:bg-pink-500")).toBe(
			"bg-pink-500 hover:bg-pink-500"
		);
	});
});

describe("tv", () => {
	test("keeps text-caption next to a text color", () => {
		const variants = tv({ base: "text-caption text-muted-foreground" });
		expect(variants()).toBe("text-caption text-muted-foreground");
	});
});
