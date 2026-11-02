import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { NAV_ITEMS, SUPPORT_URL } from "$lib/utils/navigation";
import { Footer } from "./index.js";

function links() {
	render(Footer);
	return screen.getAllByRole("link");
}

describe("Footer", () => {
	test("links to About, Tour, Learn, Privacy, Terms, Sandbox, and Support, in that order", () => {
		const hrefs = links().map((link) => link.getAttribute("href"));
		expect(hrefs).toEqual([
			"/about",
			"/tour",
			"/learn",
			"/privacy",
			"/terms",
			"/sandbox",
			SUPPORT_URL
		]);
	});

	test("names each internal link", () => {
		const names = links()
			.filter((link) => link.getAttribute("href")?.startsWith("/"))
			.map((link) => link.textContent?.trim());
		expect(names).toEqual(["About", "Tour", "Learn", "Privacy", "Terms", "Sandbox"]);
	});

	test("repeats no header, dock, or avatar menu link", () => {
		const taken = new Set(["/", "/me", "/settings", ...NAV_ITEMS.map((item) => item.href)]);
		const hrefs = links().map((link) => link.getAttribute("href"));
		expect(hrefs.filter((href) => href !== null && taken.has(href))).toEqual([]);
	});

	test("has one Support link to Ko-fi that opens safely in a new tab", () => {
		const external = links().filter((link) => !link.getAttribute("href")?.startsWith("/"));
		expect(external).toHaveLength(1);
		expect(external[0]).toHaveAccessibleName("Support");
		expect(external[0]).toHaveAttribute("href", SUPPORT_URL);
		expect(external[0]).toHaveAttribute("target", "_blank");
		expect(external[0]).toHaveAttribute("rel", "noopener noreferrer");
	});

	test("sets Sandbox apart with a hidden divider", () => {
		const sandbox = links().find((link) => link.getAttribute("href") === "/sandbox");
		expect(sandbox?.previousElementSibling).toHaveAttribute("aria-hidden", "true");
	});

	test("shows no copyright", () => {
		render(Footer);
		expect(screen.queryByText(/©/)).not.toBeInTheDocument();
	});
});
