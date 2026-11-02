import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { NAV_ITEMS } from "$lib/utils/navigation";
import { Dock } from "./index.js";

describe("Dock", () => {
	test("links to every nav item", () => {
		render(Dock, { props: { pathname: "/" } });
		const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
		expect(hrefs).toEqual(NAV_ITEMS.map((item) => item.href));
	});

	test("has no link to home", () => {
		render(Dock, { props: { pathname: "/" } });
		const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
		expect(hrefs).not.toContain("/");
	});

	test("labels each link", () => {
		render(Dock, { props: { pathname: "/" } });
		for (const item of NAV_ITEMS) {
			expect(screen.getByRole("link", { name: item.label })).toBeInTheDocument();
		}
	});

	test("marks only the current item", () => {
		render(Dock, { props: { pathname: "/lobby" } });
		const current = screen.getAllByRole("link").filter((link) => link.hasAttribute("aria-current"));
		expect(current).toEqual([screen.getByRole("link", { name: "Lobby" })]);
	});

	test("is hidden from sm up", () => {
		render(Dock, { props: { pathname: "/" } });
		expect(screen.getByRole("navigation")).toHaveClass("sm:hidden");
	});
});
