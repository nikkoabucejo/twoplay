import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { NAV_ITEMS, SUPPORT_URL } from "$lib/utils/navigation";
import { Footer } from "./index.js";

function links() {
	render(Footer);
	return screen.getAllByRole("link");
}

describe("Footer", () => {
	test("repeats no header or dock link", () => {
		const taken = new Set(["/", ...NAV_ITEMS.map((item) => item.href)]);
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

	test("shows the copyright", () => {
		render(Footer);
		expect(screen.getByText("© 2026 twoplay")).toBeInTheDocument();
	});
});
