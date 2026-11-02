import { render, screen, within } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import type { RoomHistoryEntry } from "../../../../../convex/models/rooms/index.js";
import { ClerkAuth } from "$lib/services/auth";
import { resetConvex, setQueryResult } from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import Stats from "./stats.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

function row(name: string, isMe: boolean) {
	return { userId: `user_${name}` as Id<"users">, name, rating: 1000, isMe };
}

const HISTORY: RoomHistoryEntry[] = [
	{
		code: "ABCD",
		type: "tictactoe",
		status: "closed",
		opponentName: "Grace",
		games: [
			{ round: 2, createdAt: 2_000, result: "win", mmr: 12 },
			{ round: 1, createdAt: 1_000, result: "win", mmr: 10 }
		]
	},
	{
		code: "WXYZ",
		type: "checkers",
		status: "active",
		opponentName: "Linus",
		games: [
			{ round: 3, createdAt: 5_000, result: "playing", mmr: null },
			{ round: 2, createdAt: 4_000, result: "draw", mmr: null },
			{ round: 1, createdAt: 3_000, result: "loss", mmr: -8 }
		]
	}
];

function load({ isMe = true, history = HISTORY } = {}) {
	setQueryResult(api.models.ratings.index.mine, 1240);
	setQueryResult(api.models.ratings.index.top, [
		row("A", false),
		row("B", false),
		row("Ada", isMe)
	]);
	setQueryResult(api.models.rooms.index.stats, { totalGames: 4, wins: 2, winRate: 50 });
	setQueryResult(api.models.rooms.index.history, history);
}

function tileValue(label: string) {
	return screen.getByText(label).previousElementSibling?.textContent;
}

beforeEach(() => {
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate({ id: "user_ada", email: null, name: "Ada", imageUrl: null });
});

describe("Stats", () => {
	test("signed out asks to sign in with a Sign in button and shows no stats", () => {
		context.auth?.hydrate(null);
		render(Stats);
		expect(screen.getByText("Sign in to see your stats.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
		expect(screen.queryByText("Rating")).not.toBeInTheDocument();
	});

	test("shows the rating, rank, games, and win rate", () => {
		load();
		render(Stats);
		expect(tileValue("Rating")).toBe("1240");
		expect(tileValue("Rank")).toBe("#3");
		expect(tileValue("Games")).toBe("4");
		expect(tileValue("Win rate")).toBe("50%");
	});

	test("shows Unranked outside the leaderboard", () => {
		load({ isMe: false });
		render(Stats);
		expect(tileValue("Rank")).toBe("Unranked");
	});

	test("splits the record by game", () => {
		load();
		render(Stats);
		const tictactoe = within(screen.getByText("Tic-Tac-Toe").closest("li") as HTMLElement);
		const checkers = within(screen.getByText("Checkers").closest("li") as HTMLElement);
		expect(tictactoe.getByText("Wins").nextElementSibling).toHaveTextContent("2");
		expect(tictactoe.getByText("Losses").nextElementSibling).toHaveTextContent("0");
		expect(checkers.getByText("Losses").nextElementSibling).toHaveTextContent("1");
		expect(checkers.getByText("Draws").nextElementSibling).toHaveTextContent("1");
	});

	test("lists recent rounds newest first, each linking to its round", () => {
		load();
		render(Stats);
		const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
		expect(links).toEqual([
			"/checkers/WXYZ/3",
			"/checkers/WXYZ/2",
			"/checkers/WXYZ/1",
			"/tictactoe/ABCD/2",
			"/tictactoe/ABCD/1"
		]);
		expect(
			screen.getByRole("link", { name: /Checkers · Game 1.*Linus.*Loss/ })
		).toBeInTheDocument();
	});

	test("each recent round shows its rating change, or a dash when it has none", () => {
		load({
			history: [
				{
					code: "ABCD",
					type: "tictactoe",
					status: "closed",
					opponentName: "Grace",
					games: [
						{ round: 3, createdAt: 3_000, result: "loss", mmr: 0 },
						{ round: 2, createdAt: 2_000, result: "draw", mmr: null },
						{ round: 1, createdAt: 1_000, result: "loss", mmr: -8 }
					]
				}
			]
		});
		render(Stats);
		const changes = screen
			.getAllByRole("link")
			.map((link) => link.lastElementChild?.textContent?.trim());
		expect(changes).toEqual(["0", "—", "−8"]);
	});

	test("shows an empty state with no rounds", () => {
		load({ history: [] });
		render(Stats);
		expect(screen.getByText("No games yet")).toBeInTheDocument();
	});

	test("leaves Account to the avatar menu", () => {
		load();
		render(Stats);
		expect(screen.queryByRole("button", { name: "Account" })).not.toBeInTheDocument();
	});
});
