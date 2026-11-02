import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import Page from "./+page.svelte";

vi.mock("$app/navigation", () => ({ pushState: vi.fn() }));
vi.mock("$app/state", () => ({ page: { url: new URL("https://twoplay.xyz/terms") } }));

describe("Terms page", () => {
	test("is titled Terms", () => {
		render(Page);
		expect(document.title).toBe("Terms · twoplay");
	});

	test("mentions Clerk, stored history, and no ads or tracking", () => {
		render(Page);
		expect(screen.getByText(/handled by Clerk/)).toBeInTheDocument();
		expect(screen.getByText(/game history and rating are stored/)).toBeInTheDocument();
		expect(screen.getByText(/no ads or tracking/)).toBeInTheDocument();
	});

	test("shows when it was updated, with no draft badge", () => {
		render(Page);
		expect(screen.getByText("November 2, 2026")).toBeInTheDocument();
		expect(screen.queryByText(/Draft/)).not.toBeInTheDocument();
	});
});
