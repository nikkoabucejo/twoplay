import { render, screen } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import Page from "./+page.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("https://twoplay.xyz/learn") } }));

beforeAll(() => {
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
});

describe("Learn index", () => {
	test("links to each game's rules", () => {
		render(Page);
		expect(screen.getByRole("link", { name: /^Tic-Tac-Toe/ })).toHaveAttribute(
			"href",
			"/learn/tictactoe"
		);
		expect(screen.getByRole("link", { name: /^Checkers/ })).toHaveAttribute(
			"href",
			"/learn/checkers"
		);
		expect(screen.getByRole("link", { name: /^Chess/ })).toHaveAttribute("href", "/learn/chess");
	});

	test("is titled Learn", () => {
		render(Page);
		expect(screen.getByRole("heading", { level: 1, name: "Learn" })).toBeInTheDocument();
		expect(document.title).toBe("Learn · twoplay");
	});
});
