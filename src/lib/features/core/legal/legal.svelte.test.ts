import { Ban } from "@lucide/svelte";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import Legal from "./legal.svelte";

const pushState = vi.hoisted(() => vi.fn());
vi.mock("$app/navigation", () => ({ pushState }));

const SECTIONS = [
	{ id: "sign-in", heading: "Sign-in", paragraphs: ["Handled by Clerk."] },
	{ id: "stored", heading: "What is stored", paragraphs: ["Rooms and ratings."] },
	{ id: "no-ads", heading: "No ads or tracking", paragraphs: ["None."] }
];

beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

function renderLegal() {
	render(Legal, {
		props: {
			updated: "2026-11-02",
			highlights: [{ icon: Ban, label: "No ads" }],
			sections: SECTIONS
		}
	});
	return within(screen.getByRole("navigation", { name: "On this page" }));
}

describe("Legal", () => {
	test("each contents link points at a section on the page", () => {
		const nav = renderLegal();
		const links = nav.getAllByRole("link");
		expect(links.map((link) => link.textContent?.replace(/\s+/g, " ").trim())).toEqual([
			"01 Sign-in",
			"02 What is stored",
			"03 No ads or tracking"
		]);
		for (const link of links) {
			const id = link.getAttribute("href")?.slice(1) ?? "";
			expect(link.getAttribute("href")).toMatch(/^#/);
			expect(document.getElementById(id)?.tagName).toBe("SECTION");
		}
	});

	test("marks exactly one section as the current location", () => {
		const nav = renderLegal();
		const current = nav
			.getAllByRole("link")
			.filter((link) => link.getAttribute("aria-current") === "location");
		expect(current).toHaveLength(1);
	});

	test("a contents link scrolls to its section, focuses the heading, and sets the hash", async () => {
		const nav = renderLegal();
		const link = nav.getByRole("link", { name: /What is stored/ });
		await fireEvent.click(link);
		expect(link).toHaveAttribute("aria-current", "location");
		expect(nav.getByRole("link", { name: /Sign-in/ })).not.toHaveAttribute("aria-current");
		expect(document.getElementById("stored")?.scrollIntoView).toHaveBeenCalled();
		expect(screen.getByRole("heading", { name: "What is stored" })).toHaveFocus();
		expect(pushState).toHaveBeenCalledWith("#stored", {});
	});

	test("shows the update date", () => {
		renderLegal();
		expect(screen.getByText("November 2, 2026")).toBeInTheDocument();
	});
});
