import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const css = readFileSync(new URL("./layout.css", import.meta.url), "utf8");

describe("layout.css", () => {
	test("declares a size-adjusted Inter Fallback font face", () => {
		const face = css
			.match(/@font-face\s*{[^}]*}/g)
			?.find((block) => block.includes('font-family: "Inter Fallback"'));

		expect(face).toBeDefined();
		expect(face).toMatch(/size-adjust:/);
		expect(face).toMatch(/ascent-override:/);
		expect(face).toMatch(/descent-override:/);
	});

	test("puts the fallback between Inter and sans-serif in --font-sans", () => {
		expect(css).toMatch(/--font-sans: "Inter Variable", "Inter Fallback", sans-serif;/);
	});
});
