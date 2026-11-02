import { render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
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

function player(name: string, rating: number, isMe = false) {
	return { userId: `user_${name.toLowerCase()}` as Id<"users">, name, rating, isMe };
}

const FIVE = [
	player("Bob", 460),
	player("Cy", 440),
	player("Dee", 420),
	player("Eve", 410),
	player("Ada", 400, true)
];

function statsFor(entries: typeof FIVE) {
	return Object.fromEntries(
		entries.map((entry) => [entry.userId, { totalGames: 5, wins: 2, winRate: 40 }])
	);
}

/** Every IntersectionObserver the page creates, so a test can report the own row in or out of view. */
const observers: { callback: IntersectionObserverCallback; targets: Element[] }[] = [];

function setOwnRowInView(isIntersecting: boolean) {
	for (const observer of observers) {
		observer.callback(
			observer.targets.map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry),
			{} as IntersectionObserver
		);
	}
	return tick();
}

// Keeps lottie-web inert, as in playing.svelte.test.ts: it paints a 1x1 canvas on load, then fetches JSON.
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
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			#entry: { callback: IntersectionObserverCallback; targets: Element[] };
			constructor(callback: IntersectionObserverCallback) {
				this.#entry = { callback, targets: [] };
				observers.push(this.#entry);
			}
			observe(target: Element) {
				this.#entry.targets.push(target);
			}
			disconnect() {
				observers.splice(observers.indexOf(this.#entry), 1);
			}
		}
	);
});

beforeEach(() => {
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate({ id: ADA_ID, email: null, name: "Ada", imageUrl: null });
});

function rowsNamed(name: string) {
	return screen.queryAllByRole("row").filter((row) => row.textContent?.includes(name));
}

describe("Leaderboard", () => {
	test("shows a loading status while the leaderboard loads", () => {
		render(Leaderboard);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	test("puts the top three on the podium and the rest in a table", () => {
		setQueryResult(api.models.ratings.index.top, FIVE);
		setQueryResult(api.models.rooms.index.statsForUsers, statsFor(FIVE));
		render(Leaderboard);
		const podium = within(screen.getByRole("list", { name: "Top three" }));
		expect(podium.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
			expect.stringContaining("Bob"),
			expect.stringContaining("Cy"),
			expect.stringContaining("Dee")
		]);
		const table = within(screen.getByRole("table"));
		expect(table.getAllByRole("columnheader").map((header) => header.textContent?.trim())).toEqual([
			"Rank",
			"Player",
			"Games",
			"Win rate",
			"Rating"
		]);
		expect(rowsNamed("Eve")).toHaveLength(1);
		expect(rowsNamed("Ada")).toHaveLength(1);
		expect(rowsNamed("Bob")).toHaveLength(0);
	});

	test("with one player, shows only the podium", () => {
		setQueryResult(api.models.ratings.index.top, [player("Ada", 400, true)]);
		setQueryResult(api.models.rooms.index.statsForUsers, {});
		render(Leaderboard);
		const podium = within(screen.getByRole("list", { name: "Top three" }));
		expect(podium.getAllByRole("listitem")).toHaveLength(1);
		expect(podium.getByText("Rank 1")).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	test("shows each row's games and win rate once stats load", () => {
		setQueryResult(api.models.ratings.index.top, FIVE);
		setQueryResult(api.models.rooms.index.statsForUsers, statsFor(FIVE));
		render(Leaderboard);
		const eve = within(rowsNamed("Eve")[0]);
		expect(eve.getByText("5 games · 40% win")).toBeInTheDocument();
		expect(eve.getByText("40%")).toBeInTheDocument();
	});

	test("shows a dash, not zeros, while row stats load", () => {
		setQueryResult(api.models.ratings.index.top, FIVE);
		render(Leaderboard);
		const eve = within(rowsNamed("Eve")[0]);
		expect(eve.getAllByText("—")).toHaveLength(3);
		expect(screen.queryByText(/\d+ games/)).not.toBeInTheDocument();
	});

	test("pins your row to the bottom when it is out of view", async () => {
		setQueryResult(api.models.ratings.index.top, FIVE);
		render(Leaderboard);
		await setOwnRowInView(false);
		const ada = rowsNamed("Ada");
		expect(ada).toHaveLength(2);
		expect(within(ada[1]).getByText("5")).toBeInTheDocument();
		expect(within(ada[1]).getByText("400")).toBeInTheDocument();
	});

	test("hides the pinned row while your row is in view", async () => {
		setQueryResult(api.models.ratings.index.top, FIVE);
		render(Leaderboard);
		await setOwnRowInView(false);
		await setOwnRowInView(true);
		expect(rowsNamed("Ada")).toHaveLength(1);
	});

	test("pins no row when you are on the podium", async () => {
		setQueryResult(api.models.ratings.index.top, [
			player("Ada", 460, true),
			...FIVE.filter((entry) => !entry.isMe)
		]);
		render(Leaderboard);
		await setOwnRowInView(false);
		expect(rowsNamed("Ada")).toHaveLength(0);
	});

	test("with no ratings, says so and leaves new games to the Play nav", () => {
		setQueryResult(api.models.ratings.index.top, []);
		render(Leaderboard);
		expect(screen.getByText("No ratings yet")).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	test("signed out, asks to sign in with a Sign in button", () => {
		context.auth!.hydrate(null);
		render(Leaderboard);
		expect(screen.getByText("Sign in to see the leaderboard.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});
});
