import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test } from "vitest";
import { Page } from "./index.js";

const children = createRawSnippet(() => ({ render: () => "<p>Content</p>" }));
const sidebar = createRawSnippet(() => ({ render: () => "<p>Sidebar</p>" }));
const actions = createRawSnippet(() => ({ render: () => "<button>Refresh</button>" }));
const SIDEBAR_GRID = "lg:grid-cols-[minmax(0,1fr)_18rem]";

describe("Page", () => {
	test("renders its children", () => {
		render(Page, { props: { children } });
		expect(screen.getByText("Content")).toBeInTheDocument();
	});

	test("puts the sidebar after the content inside the lg grid", () => {
		const { container } = render(Page, { props: { children, sidebar } });
		const grid = container.querySelector(`[class*="${SIDEBAR_GRID}"]`);
		expect(grid).toContainElement(screen.getByText("Content"));
		expect(grid).toContainElement(screen.getByText("Sidebar"));
		expect(
			screen.getByText("Content").compareDocumentPosition(screen.getByText("Sidebar")) &
				Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	test("has no sidebar grid without a sidebar", () => {
		const { container } = render(Page, { props: { children } });
		expect(container.querySelector(`[class*="${SIDEBAR_GRID}"]`)).toBeNull();
	});

	test("renders the title as the only h1", () => {
		render(Page, { props: { children, title: "Leaderboard" } });
		const headings = screen.getAllByRole("heading", { level: 1 });
		expect(headings).toHaveLength(1);
		expect(headings[0]).toHaveTextContent("Leaderboard");
	});

	test("renders no heading without a title", () => {
		render(Page, { props: { children } });
		expect(screen.queryByRole("heading")).toBeNull();
	});

	test("renders the description when given", () => {
		render(Page, {
			props: { children, title: "Leaderboard", description: "Top players by rating." }
		});
		expect(screen.getByText("Top players by rating.")).toBeInTheDocument();
	});

	test("renders no description when none is given", () => {
		render(Page, { props: { children, title: "Leaderboard" } });
		expect(screen.getByRole("heading", { level: 1 }).nextElementSibling).toBeNull();
	});

	test("renders the actions when given", () => {
		render(Page, { props: { children, title: "Leaderboard", actions } });
		expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
	});

	test("puts the title before the content", () => {
		render(Page, { props: { children, title: "Play" } });
		expect(
			screen
				.getByRole("heading", { level: 1 })
				.compareDocumentPosition(screen.getByText("Content")) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	test("applies titleClass to the title block", () => {
		render(Page, { props: { children, title: "Play", titleClass: "sr-only" } });
		expect(screen.getByRole("heading", { level: 1 }).closest(".sr-only")).not.toBeNull();
	});
});
