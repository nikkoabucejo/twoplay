import { render, screen, within } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import About, { REPO_URL, TIMELINE } from "./about.svelte";
import { ABOUT_BUILD_KEY } from "./prepaint.js";

const SECTION_HEADINGS = [
	"Who I am",
	"Why this?",
	"Highlights",
	"How it's built",
	"What I learned",
	"Timeline",
	"What's next",
	"Made by Nikko Abucejo"
];

const PIPELINE_STEPS = [
	"Triage",
	"Spec",
	"Approval",
	"Build",
	"Tests",
	"Live QA",
	"Review",
	"Commit"
];

beforeEach(() => {
	sessionStorage.setItem(ABOUT_BUILD_KEY, "1");
});

afterEach(() => {
	sessionStorage.clear();
});

describe("About", () => {
	test("credits Nikko Abucejo", () => {
		render(About);
		expect(screen.getByRole("heading", { name: "Made by Nikko Abucejo" })).toBeInTheDocument();
	});

	test("orders the section headings", () => {
		render(About);
		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings.map((heading) => heading.textContent?.trim())).toEqual(SECTION_HEADINGS);
	});

	test("links to the repo once, opening safely in a new tab", () => {
		render(About);
		const repoLinks = screen
			.getAllByRole("link")
			.filter((link) => link.getAttribute("href") === REPO_URL);
		expect(repoLinks).toHaveLength(1);
		expect(REPO_URL).toBe("https://github.com/nikkoabucejo/twoplay");
		expect(repoLinks[0]).toHaveAccessibleName(/Source on GitHub/);
		expect(repoLinks[0]).toHaveAttribute("target", "_blank");
		expect(repoLinks[0]).toHaveAttribute("rel", "noopener noreferrer");
	});

	test("the repo link is a plain link without the comet ring", () => {
		render(About);
		expect(screen.getByRole("link", { name: /Source on GitHub/ })).not.toHaveClass("hover-ring");
	});

	test("links to the tour once", () => {
		render(About);
		const tourLinks = screen
			.getAllByRole("link")
			.filter((link) => link.getAttribute("href") === "/tour");
		expect(tourLinks).toHaveLength(1);
		expect(tourLinks[0]).toHaveAccessibleName("Take the tour");
	});

	test("renders every timeline milestone in order with its date and short hash", () => {
		render(About);
		const timeline = screen.getByRole("region", { name: "Timeline" });
		const items = within(timeline).getAllByRole("listitem");
		expect(items.map((item) => within(item).getByRole("heading").textContent?.trim())).toEqual(
			TIMELINE.map((milestone) => milestone.title)
		);
		expect(items.map((item) => item.querySelector("time")?.getAttribute("datetime"))).toEqual(
			TIMELINE.map((milestone) => milestone.date)
		);
		items.forEach((item, index) => {
			expect(TIMELINE[index].hash).toMatch(/^[0-9a-f]{7}$/);
			expect(within(item).getByText(TIMELINE[index].hash)).toBeInTheDocument();
		});
	});

	test("starts the timeline at the first commit", () => {
		render(About);
		expect(TIMELINE[0]).toMatchObject({ title: "First commit", hash: "09fda3a" });
		const first = within(screen.getByRole("region", { name: "Timeline" })).getAllByRole(
			"listitem"
		)[0];
		expect(within(first).getByText("Jul 11, 2026")).toBeInTheDocument();
	});

	test("clears the pre-paint flag when the build does not autoplay", () => {
		document.documentElement.dataset.aboutBuild = "pending";
		render(About);
		flushSync();
		expect(document.documentElement).not.toHaveAttribute("data-about-build");
	});

	test("lists the eight pipeline steps with only Approval as Nikko's", () => {
		render(About);
		const pipeline = screen.getByRole("region", { name: "How it's built" });
		const steps = within(pipeline).getAllByRole("listitem");
		expect(steps).toHaveLength(PIPELINE_STEPS.length);
		steps.forEach((step, index) => expect(step).toHaveTextContent(PIPELINE_STEPS[index]));
		const nikkos = steps.filter((step) => within(step).queryByText("Nikko"));
		expect(nikkos).toEqual([steps[PIPELINE_STEPS.indexOf("Approval")]]);
	});

	test("logs one request's run, with the failing tests fixed before commit", () => {
		render(About);
		const pipeline = screen.getByRole("region", { name: "How it's built" });
		expect(within(pipeline).getByText('/dev:work "rework the about page"')).toBeInTheDocument();
		expect(within(pipeline).getByText("17 failing")).toBeInTheDocument();
		expect(within(pipeline).getByText("107/107")).toBeInTheDocument();
		expect(within(pipeline).getByText("bbb17c6")).toBeInTheDocument();
	});

	describe("during a build", () => {
		beforeEach(() => {
			sessionStorage.clear();
			vi.useFakeTimers();
			// jsdom has no SVG geometry; the hero board's draw targets measure their paths.
			Object.defineProperties(SVGElement.prototype, {
				getTotalLength: { configurable: true, value: () => 100 },
				getPointAtLength: { configurable: true, value: () => ({ x: 0, y: 0 }) }
			});
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
			Reflect.deleteProperty(SVGElement.prototype, "getTotalLength");
			Reflect.deleteProperty(SVGElement.prototype, "getPointAtLength");
		});

		test("puts Skip first in the page content", () => {
			const { container } = render(About);
			flushSync();
			const root = container.querySelector(".about-root") as HTMLElement;
			expect(root.querySelector("a[href], button")).toBe(
				screen.getByRole("button", { name: "Skip" })
			);
		});

		test("hides the overlay from assistive technology", () => {
			const { container } = render(About);
			flushSync();
			const overlay = container.querySelector("[data-build-overlay]");
			expect(overlay).toHaveAttribute("aria-hidden", "true");
		});

		test("keeps every heading's accessible name at its final text", () => {
			render(About);
			flushSync();
			expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
				"How twoplay came to be"
			);
			const headings = screen.getAllByRole("heading", { level: 2 });
			headings.forEach((heading, index) =>
				expect(heading).toHaveAccessibleName(SECTION_HEADINGS[index])
			);
			expect(headings).toHaveLength(SECTION_HEADINGS.length);
		});
	});
});
