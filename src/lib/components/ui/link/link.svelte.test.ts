import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test } from "vitest";
import { Link, linkVariants } from "./index.js";

const children = createRawSnippet(() => ({ render: () => "<span>Lobby</span>" }));

function renderLink(pathname: string, href = "/lobby") {
	render(Link, { props: { href, pathname, children } });
	return screen.getByRole("link", { name: "Lobby" });
}

describe("Link", () => {
	test("links to its href", () => {
		expect(renderLink("/")).toHaveAttribute("href", "/lobby");
	});

	test("is the current page on an exact match", () => {
		expect(renderLink("/lobby")).toHaveAttribute("aria-current", "page");
	});

	test("is the current page below its href", () => {
		expect(renderLink("/history/abc", "/history")).toHaveAttribute("aria-current", "page");
	});

	test("is not current on another page", () => {
		expect(renderLink("/play")).not.toHaveAttribute("aria-current");
	});

	test("is not current on a page that only shares a prefix", () => {
		expect(renderLink("/playground", "/play")).not.toHaveAttribute("aria-current");
	});

	test("Home is not current on other pages", () => {
		expect(renderLink("/play", "/")).not.toHaveAttribute("aria-current");
	});

	test("shows a full-opacity focus ring", () => {
		expect(renderLink("/")).toHaveClass("focus-visible:ring-2", "focus-visible:ring-ring");
	});
});

describe("linkVariants", () => {
	test("an inactive stacked tab keeps both its caption size and muted color", () => {
		const classes = linkVariants({ layout: "stacked", current: false }).split(" ");
		expect(classes).toContain("text-caption");
		expect(classes).toContain("text-muted-foreground");
	});
});
