import { describe, expect, test } from "vitest";
import { cn } from "./index.js";

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

	test("resolves conflicts within the same variant only", () => {
		expect(cn("hover:bg-cyan-500 bg-pink-500", "hover:bg-pink-500")).toBe(
			"bg-pink-500 hover:bg-pink-500"
		);
	});
});
