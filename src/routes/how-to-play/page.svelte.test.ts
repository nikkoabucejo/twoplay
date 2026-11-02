import { render, screen } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import Page from "./+page.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("https://twoplay.xyz/how-to-play") } }));

beforeAll(() => {
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
});

describe("How to play index", () => {
	test("links to each game's rules", () => {
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

	test("is titled How to play", () => {
		render(Page);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How to play");
		expect(document.title).toBe("How to play · twoplay");
	});
});
