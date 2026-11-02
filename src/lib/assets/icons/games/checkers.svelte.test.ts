import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CheckersIcon from "./checkers.svelte";

// `prefersReducedMotion` reads `window.matchMedia` when svelte/motion loads, so the stub
// is installed before the imports run and reads `reduce` on every check.
const motion = vi.hoisted(() => {
	const state = { reduce: false };
	window.matchMedia = (query: string) =>
		({
			media: query,
			get matches() {
				return state.reduce && query === "(prefers-reduced-motion: reduce)";
			},
			addEventListener() {},
			removeEventListener() {}
		}) as unknown as MediaQueryList;
	return state;
});

const RESTING_POINTS = ["3,17 8.67,17 5.83,7", "8.67,17 15.33,17 12,2.5", "15.33,17 21,17 18.17,7"];
const RESTING_CY = ["7", "2.5", "7"];

describe("CheckersIcon", () => {
	beforeEach(() => {
		motion.reduce = false;
	});

	test("bounces its pieces by default", () => {
		const { container } = render(CheckersIcon);

		expect(container.querySelectorAll("animate")).toHaveLength(6);
	});

	test("rests its pieces when reduced motion is requested", () => {
		motion.reduce = true;
		const { container } = render(CheckersIcon);
		const polygons = [...container.querySelectorAll("polygon")];
		const circles = [...container.querySelectorAll("circle")];

		expect(container.querySelectorAll("animate")).toHaveLength(0);
		expect(polygons.map((polygon) => polygon.getAttribute("points"))).toEqual(RESTING_POINTS);
		expect(circles.map((circle) => circle.getAttribute("cy"))).toEqual(RESTING_CY);
		expect(circles.map((circle) => circle.getAttribute("cx"))).toEqual(["5.83", "12", "18.17"]);
	});
});
