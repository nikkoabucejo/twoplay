import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const css = readFileSync(new URL("./layout.css", import.meta.url), "utf8");

function utility(name: string) {
	return css.match(new RegExp(`@utility ${name}\\s*{[\\s\\S]*?\\n}`))?.[0];
}

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

	test("motion-safe and motion-reduce honor the forced reduce-motion class", () => {
		const safe = css.match(/@custom-variant motion-safe\s*{[\s\S]*?\n}/)?.[0];
		const reduce = css.match(/@custom-variant motion-reduce\s*{[\s\S]*?\n}/)?.[0];

		expect(safe).toMatch(/prefers-reduced-motion: no-preference/);
		expect(safe).toMatch(/:not\(\.reduce-motion \*\)/);
		expect(reduce).toMatch(/prefers-reduced-motion: reduce/);
		expect(reduce).toMatch(/\.reduce-motion \*/);
	});

	test("the reduce-motion class ends animations and transitions immediately", () => {
		const reset = css.match(/^\.reduce-motion \*[^{]*{[^}]*}/m)?.[0];

		expect(reset).toMatch(/animation-duration: 0\.01ms !important;/);
		expect(reset).toMatch(/animation-iteration-count: 1 !important;/);
		expect(reset).toMatch(/transition-duration: 0\.01ms !important;/);
	});

	test("comet-ring is a seat-tinted overlay that holds still under reduced motion", () => {
		const comet = utility("comet-ring");

		expect(css).toMatch(/@property --sel-angle\s*{/);
		expect(css).toMatch(/@keyframes sel-spin\s*{/);
		expect(comet).toMatch(/position: relative;/);
		expect(comet).toMatch(/isolation: isolate;/);
		expect(comet).toMatch(/var\(--seat-0\)/);
		expect(comet).toMatch(/var\(--seat-1\)/);
		expect(comet).not.toMatch(/#[0-9a-f]{3,8}\b/i);
		expect(comet).toMatch(/animation: sel-spin 4\.5s linear infinite paused;/);
		expect(comet).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none;/);
		expect(comet).toMatch(/&:where\(\.reduce-motion \*\)::before\s*{\s*animation: none;/);
	});

	test("selected-ring runs the comet ring in seat colors", () => {
		const selected = utility("selected-ring");

		expect(selected).toMatch(/@apply comet-ring;/);
		expect(selected).toMatch(/&::before\s*{\s*opacity: 1;\s*animation-play-state: running;/);
		expect(selected).not.toMatch(/--ring-[01]:/);
	});

	test("comet-ring reads its colors from ring variables that default to seat colors", () => {
		const comet = utility("comet-ring");

		expect(comet).toMatch(/var\(--ring-0, var\(--seat-0\)\)/);
		expect(comet).toMatch(/var\(--ring-1, var\(--seat-1\)\)/);
		expect(comet?.replace(/var\(--ring-[01], var\(--seat-[01]\)\)/g, "")).not.toMatch(
			/var\(--seat-[01]\)/
		);
	});

	test("hover-ring runs a muted comet ring only on hover", () => {
		const hover = utility("hover-ring");

		expect(hover).toMatch(/@apply comet-ring;/);
		expect(hover).toMatch(/--ring-0: var\(--muted-foreground\);/);
		expect(hover).toMatch(/--ring-1: var\(--muted-foreground\);/);
		expect(hover).toMatch(/@media \(hover: hover\)/);
		const before = hover?.match(/:hover:not\(:disabled\)::before\s*{([^}]*)}/)?.[1];
		const opacity = Number(before?.match(/opacity: ([\d.]+);/)?.[1]);
		expect(opacity).toBeGreaterThan(0);
		expect(opacity).toBeLessThan(1);
		expect(before).toMatch(/animation-play-state: running;/);
		expect(before).not.toMatch(/animation:/);
	});
});
