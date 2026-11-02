import { render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import { ClerkAuth } from "$lib/services/auth";
import { resetConvex, setQueryResult } from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import Leaderboard from "./leaderboard.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

const ADA_ID = "user_ada" as Id<"users">;

function loadAll({ top = true, mine = true, stats = true } = {}) {
	if (top) {
		setQueryResult(api.models.ratings.index.top, [
			{ userId: ADA_ID, name: "Ada", rating: 1234, isMe: true }
		]);
	}
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
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
});

beforeEach(() => {
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate({ id: ADA_ID, email: null, name: "Ada", imageUrl: null });
});

function ratingCardSkeleton(container: HTMLElement) {
	return container.querySelector("[data-slot='rating-card-skeleton']");
}

describe("Leaderboard", () => {
	test.each([
		["the leaderboard", { top: false }],
		["your rating", { mine: false }],
		["your stats", { stats: false }]
	])("shows the skeletons while %s loads", (_, loaded) => {
		loadAll(loaded);
		const { container } = render(Leaderboard);
		expect(ratingCardSkeleton(container)).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
		expect(screen.queryByText("Your Rating")).not.toBeInTheDocument();
	});

	test("the rating card skeleton has the card's box and a line per text row", () => {
		const { container } = render(Leaderboard);
		const card = ratingCardSkeleton(container);
		expect(card).toHaveClass("rounded-2xl", "border", "p-6");
		expect(card).toHaveAttribute("aria-hidden", "true");
		const lines = card?.querySelectorAll(":scope > div > [data-slot='skeleton']");
		expect(lines).toHaveLength(3);
		expect(card?.querySelector(".border-t.pt-3")).toBeInTheDocument();
	});

	test("shows the rating card and the list once everything loads", () => {
		loadAll();
		const { container } = render(Leaderboard);
		expect(ratingCardSkeleton(container)).not.toBeInTheDocument();
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(screen.getByText("Your Rating")).toBeInTheDocument();
		expect(screen.getByText("Rank #1 of 1")).toBeInTheDocument();
	});

	test("Sign in is disabled when the auth client failed to load", () => {
		context.auth!.hydrate(null);
		context.auth!.loadError = "Failed to load @clerk/ui bundle";
		render(Leaderboard);
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});

	test("Sign in is enabled while signed out", () => {
		context.auth!.hydrate(null);
		render(Leaderboard);
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});
});
