import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { FeedSkeleton } from "./index.js";

describe("FeedSkeleton", () => {
	test("announces that the list is loading", () => {
		render(FeedSkeleton);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
	});

	test("takes the Feed's box", () => {
		render(FeedSkeleton);
		expect(screen.getByRole("status")).toHaveClass("w-full", "max-w-md", "min-h-0", "flex-1");
	});

	test("renders five rows by default", () => {
		const { container } = render(FeedSkeleton);
		expect(container.querySelectorAll("li")).toHaveLength(5);
	});

	test("renders the requested number of rows", () => {
		const { container } = render(FeedSkeleton, { props: { rows: 3 } });
		expect(container.querySelectorAll("li")).toHaveLength(3);
	});

	test("each row has the Tile's box and header row", () => {
		const { container } = render(FeedSkeleton);
		for (const row of container.querySelectorAll("li")) {
			expect(row).toHaveClass("rounded-xl", "border", "p-3");
			expect(row.querySelector("[data-slot='skeleton'].size-8")).toBeInTheDocument();
			expect(row.querySelectorAll("[data-slot='skeleton'].h-3")).toHaveLength(2);
		}
	});

	test("hides the rows from assistive technology", () => {
		const { container } = render(FeedSkeleton);
		expect(container.querySelector("ul")).toHaveAttribute("aria-hidden", "true");
		expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
	});
});
