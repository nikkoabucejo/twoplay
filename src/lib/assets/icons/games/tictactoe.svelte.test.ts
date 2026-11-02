import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import TictactoeIcon from "./tictactoe.svelte";

const source = readFileSync(join(import.meta.dirname, "tictactoe.svelte"), "utf8");
const MEDIA = "@media (prefers-reduced-motion: no-preference)";

// jsdom can't evaluate media queries, so the test reads where the declaration sits.
function splitMediaBlock(css: string): { inside: string; outside: string } {
	const start = css.indexOf(MEDIA);
	if (start === -1) return { inside: "", outside: css };
	const open = css.indexOf("{", start);
	let depth = 0;
	let end = open;
	for (; end < css.length; end++) {
		if (css[end] === "{") depth++;
		if (css[end] === "}" && --depth === 0) break;
	}
	return { inside: css.slice(open, end + 1), outside: css.slice(0, start) + css.slice(end + 1) };
}

describe("TictactoeIcon", () => {
	test("renders a hidden svg with the X group", () => {
		const { container } = render(TictactoeIcon);
		const svg = container.querySelector("svg");

		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg?.querySelectorAll(".tictactoe-x-wobble line")).toHaveLength(2);
	});

	test("animates the X only when motion is not reduced", () => {
		const { inside, outside } = splitMediaBlock(source);

		expect(inside).toMatch(/\.tictactoe-x-wobble\s*{[^}]*animation:/);
		expect(outside).not.toMatch(/animation:/);
	});
});
