import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import ChessIcon from "./chess.svelte";

const source = readFileSync(join(import.meta.dirname, "chess.svelte"), "utf8");
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

describe("ChessIcon", () => {
	test("renders a hidden svg with the knight split into two clipped halves", () => {
		const { container } = render(ChessIcon);
		const svg = container.querySelector("svg");
		const halves = [...container.querySelectorAll(".chess-knight-nod > g")];

		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg).toBeVisible();
		expect(halves.map((half) => half.getAttribute("stroke"))).toEqual(["#00e5ff", "#ff0080"]);
		for (const half of halves) {
			const clipId = half.getAttribute("clip-path")?.match(/^url\(#(.+)\)$/)?.[1];
			expect(clipId && container.querySelector(`clipPath[id="${clipId}"]`)).toBeTruthy();
			expect(half.querySelectorAll("path")).toHaveLength(5);
		}
	});

	test("gives each instance its own clip path ids", () => {
		const { container } = render(ChessIcon);
		render(ChessIcon);
		const ids = [...document.querySelectorAll("clipPath")].map((clip) => clip.id);

		expect(container.querySelectorAll("clipPath")).toHaveLength(2);
		expect(new Set(ids).size).toBe(4);
	});

	test("nods the knight by default", () => {
		const { inside } = splitMediaBlock(source);

		expect(inside).toMatch(/\.chess-knight-nod\s*{[^}]*animation:\s*chess-nod/);
	});

	test("rests the knight upright when reduced motion is requested", () => {
		const { container } = render(ChessIcon);
		const { outside } = splitMediaBlock(source);

		expect(outside).not.toMatch(/animation:/);
		expect(outside).not.toMatch(/\.chess-knight-nod\s*{[^}]*transform:/);
		expect(container.querySelectorAll("animate, animateTransform")).toHaveLength(0);
	});
});
