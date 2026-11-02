import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import About, { REPO_URL, TIMELINE } from "./about.svelte";

describe("About", () => {
	test("credits Nikko Abucejo", () => {
		render(About);
		expect(screen.getByRole("heading", { name: "Made by Nikko Abucejo" })).toBeInTheDocument();
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

	test("renders every timeline milestone in order with its date", () => {
		render(About);
		const timeline = screen.getByRole("heading", { name: "Timeline" }).nextElementSibling;
		const items = within(timeline as HTMLElement).getAllByRole("listitem");
		expect(items.map((item) => within(item).getByRole("heading").textContent)).toEqual(
			TIMELINE.map((milestone) => milestone.title)
		);
		expect(items.map((item) => item.querySelector("time")?.getAttribute("datetime"))).toEqual(
			TIMELINE.map((milestone) => milestone.date)
		);
	});

	test("starts the timeline at the first commit", () => {
		render(About);
		expect(screen.getByText("Jul 11, 2026")).toBeInTheDocument();
	});

	test("links to the tour", () => {
		render(About);
		expect(screen.getByRole("link", { name: "Take the tour" })).toHaveAttribute("href", "/tour");
	});

	test("marks the engineer's approval step in the workflow", () => {
		render(About);
		expect(screen.getByText("Approval").closest("li")).toHaveClass("selected-ring");
		expect(screen.getByText("Nikko gives the approval. Agents do the rest.")).toBeInTheDocument();
	});
});
