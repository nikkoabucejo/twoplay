import { render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import { resetConvex, setQueryResult } from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import RatingSummary from "./rating-summary.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));

const ADA = { userId: "user_ada" as Id<"users">, name: "Ada", rating: 1234, isMe: true };
const BOB = { userId: "user_bob" as Id<"users">, name: "Bob", rating: 1300, isMe: false };

function loadAll({ top = true, mine = true, stats = true } = {}) {
	if (top) setQueryResult(api.models.ratings.index.top, [ADA]);
	if (mine) setQueryResult(api.models.ratings.index.mine, 1234);
	if (stats) {
		setQueryResult(api.models.rooms.index.stats, { totalGames: 4, wins: 2, winRate: 50 });
	}
}

// Keeps lottie-web inert, as in playing.svelte.test.ts: it paints a 1x1 canvas on load, then fetches JSON.
// Sparkle imports it lazily, so load it here while the stub is in place rather than after the last test.
beforeAll(async () => {
	const proxyImageContext = { fillStyle: "", fillRect() {} } as unknown as CanvasRenderingContext2D;
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(proxyImageContext);
	vi.stubGlobal(
		"XMLHttpRequest",
		class {
			open() {}
			send() {}
		}
	);
	await import("lottie-web");
});

beforeEach(() => {
	resetConvex();
});

function ratingCardSkeleton(container: HTMLElement) {
	return container.querySelector("[data-slot='rating-card-skeleton']");
}

describe("RatingSummary", () => {
	test.each([
		["the leaderboard", { top: false }],
		["your rating", { mine: false }],
		["your stats", { stats: false }]
	])("shows the skeleton while %s loads", (_, loaded) => {
		loadAll(loaded);
		const { container } = render(RatingSummary);
		expect(ratingCardSkeleton(container)).toBeInTheDocument();
		expect(screen.queryByText("Your rating")).not.toBeInTheDocument();
	});

	test("the skeleton has the card's box and a line per text row", () => {
		const { container } = render(RatingSummary);
		const card = ratingCardSkeleton(container);
		expect(card).toHaveClass("rounded-2xl", "border", "p-6");
		expect(card).toHaveAttribute("aria-hidden", "true");
		const lines = card?.querySelectorAll(":scope > div > [data-slot='skeleton']");
		expect(lines).toHaveLength(3);
		expect(card?.querySelector(".border-t.pt-3")).toBeInTheDocument();
	});

	test("shows your rating, rank, games, and win rate once everything loads", () => {
		loadAll();
		const { container } = render(RatingSummary);
		expect(ratingCardSkeleton(container)).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Your rating" })).toBeInTheDocument();
		expect(screen.getByText("1234")).toBeInTheDocument();
		expect(screen.getByText("Rank #1 of 1")).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();
		expect(screen.getByText("50%")).toBeInTheDocument();
	});

	test("asks a player with no finished games to finish one", () => {
		loadAll({ top: false, stats: false });
		setQueryResult(api.models.ratings.index.top, [BOB]);
		setQueryResult(api.models.rooms.index.stats, { totalGames: 0, wins: 0, winRate: 0 });
		render(RatingSummary);
		expect(screen.getByText("Finish a game to get ranked")).toBeInTheDocument();
	});

	test("says not in the top list after finished games", () => {
		loadAll({ top: false });
		setQueryResult(api.models.ratings.index.top, [BOB]);
		render(RatingSummary);
		expect(screen.getByText("Not in the top 1")).toBeInTheDocument();
	});
});
