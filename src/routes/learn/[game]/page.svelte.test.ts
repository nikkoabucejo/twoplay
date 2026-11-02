import { render, screen } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import type { GameType } from "../../../../convex/models/games/index.js";
import Page from "./+page.svelte";

vi.mock("$app/state", () => ({
	page: { url: new URL("https://twoplay.xyz/learn/checkers") }
}));

function renderGame(game: GameType) {
	render(Page, { props: { data: { game, user: null }, params: { game } } });
}

beforeAll(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
});

describe("Learn a game", () => {
	test("names the game in the heading and the document title", () => {
		renderGame("checkers");
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Learn Checkers");
		expect(document.title).toBe("Learn Checkers · twoplay");
	});

	test("names chess in the heading and the document title", () => {
		renderGame("chess");
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Learn Chess");
		expect(document.title).toBe("Learn Chess · twoplay");
	});

	test("has one Play link, to the play page with the game picked", () => {
		renderGame("tictactoe");
		const links = screen.getAllByRole("link", { name: /^Play/ });
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveAttribute("href", "/play?game=tictactoe");
	});

	test("shows the game's rules", () => {
		renderGame("tictactoe");
		expect(screen.getByRole("heading", { name: "Switch boards" })).toBeInTheDocument();
	});
});
