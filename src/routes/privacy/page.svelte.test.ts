import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import Page from "./+page.svelte";

vi.mock("$app/navigation", () => ({ pushState: vi.fn() }));
vi.mock("$app/state", () => ({ page: { url: new URL("https://twoplay.xyz/privacy") } }));

describe("Privacy page", () => {
	test("is titled Privacy with a description", () => {
		render(Page);
		expect(document.title).toBe("Privacy · twoplay");
		expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute("content");
	});

	test("mentions Clerk, game history, and no ads or tracking", () => {
		render(Page);
		expect(screen.getByText(/handled by Clerk/)).toBeInTheDocument();
		expect(screen.getByText(/game history/)).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "No ads or tracking" })).toBeInTheDocument();
	});

	test("shows when it was updated, with no draft badge", () => {
		render(Page);
		expect(screen.getByText("November 2, 2026")).toBeInTheDocument();
		expect(screen.queryByText(/Draft/)).not.toBeInTheDocument();
	});
});
