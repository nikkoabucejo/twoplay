import { render, screen } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { SUPPORT_URL } from "$lib/utils/navigation";
import Page from "./+page.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("https://twoplay.xyz/tour") } }));

beforeAll(() => {
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
});

describe("Tour page", () => {
	test("has one h1 and the Tour title", () => {
		render(Page);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(document.title).toBe("Tour · twoplay");
	});

	test("names both games and links to their rules", () => {
		render(Page);
		expect(screen.getByRole("link", { name: /^Tic-Tac-Toe/ })).toHaveAttribute(
			"href",
			"/how-to-play/tictactoe"
		);
		expect(screen.getByRole("link", { name: /^Checkers/ })).toHaveAttribute(
			"href",
			"/how-to-play/checkers"
		);
	});

	test("has no Ko-fi link", () => {
		render(Page);
		const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
		expect(hrefs).not.toContain(SUPPORT_URL);
	});
});
