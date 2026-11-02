import { render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import type { RoomHistoryEntry } from "../../../../../convex/models/rooms/index.js";
import { ClerkAuth } from "$lib/services/auth";
import {
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import History from "./history.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

const NOW = new Date(2026, 9, 30, 15, 0).getTime();
const TODAY = new Date(2026, 9, 30, 10, 0).getTime();
const YESTERDAY = new Date(2026, 9, 29, 10, 0).getTime();

const PAST_ROOM: RoomHistoryEntry = {
	code: "WXYZ",
	type: "tictactoe",
	status: "closed",
	opponentName: "Bob Baker",
	games: [{ round: 1, createdAt: YESTERDAY + 2, result: "win", mmr: 8 }]
};

// Keeps lottie-web inert, as in playing.svelte.test.ts: it paints a 1x1 canvas on load, then fetches JSON.
// Emoji imports it lazily, so load it here while the stub is in place rather than after the last test.
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
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(NOW);
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate({ id: "user_ada", email: null, name: "Ada", imageUrl: null });
	setQueryResult(api.models.rooms.index.get, roomSnapshot(tictactoeEngine.createInitialState()));
});

afterEach(() => {
	vi.useRealTimers();
});

const OTHER_ROOM: RoomHistoryEntry = {
	code: "QRST",
	type: "checkers",
	status: "closed",
	opponentName: "Cy Cole",
	games: [{ round: 1, createdAt: YESTERDAY + 1, result: "loss", mmr: -8 }]
};

const ACTIVE_ROOM: RoomHistoryEntry = {
	code: "ABCD",
	type: "tictactoe",
	status: "active",
	opponentName: "Dee Dunn",
	games: [{ round: 1, createdAt: TODAY, result: "playing", mmr: null }]
};

/** The opponent of each finished round on the page, in page order, read from its Replay link. */
function rows() {
	return screen
		.queryAllByRole("link", { name: /^Replay / })
		.map((link) => link.getAttribute("aria-label")?.match(/ vs (.+), room /)?.[1]);
}

function playingCard() {
	return screen.queryByRole("button", { name: "Abandon" });
}

describe("History", () => {
	test("shows the feed skeleton while the history loads", () => {
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
		expect(playingCard()).not.toBeInTheDocument();
	});

	test("shows the feed skeleton while the active room loads", () => {
		setQueryResult(api.models.rooms.index.history, [PAST_ROOM]);
		render(History);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
		expect(playingCard()).not.toBeInTheDocument();
		expect(screen.queryByText("Bob Baker")).not.toBeInTheDocument();
	});

	test("shows the active room and the history together once both load", () => {
		setQueryResult(api.models.rooms.index.history, [PAST_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(playingCard()).toBeInTheDocument();
		expect(screen.getByText("Bob Baker")).toBeInTheDocument();
	});

	test("puts the active room after the feed, so its arrival never pushes the list down", () => {
		setQueryResult(api.models.rooms.index.history, [PAST_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		const list = screen.getByText("Bob Baker");
		const card = playingCard();
		expect(card?.compareDocumentPosition(list)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
	});

	test("an in-progress game only pulses when motion is allowed", () => {
		setQueryResult(api.models.rooms.index.history, [
			{ ...PAST_ROOM, games: [{ round: 1, createdAt: TODAY, result: "playing", mmr: null }] }
		]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		const label = screen.getByText("Playing");
		expect(label).toHaveClass("motion-safe:animate-pulse");
		expect(label).not.toHaveClass("animate-pulse");
	});

	test("leaves the active room out of the list, to the Playing card", () => {
		setQueryResult(api.models.rooms.index.history, [ACTIVE_ROOM, PAST_ROOM, OTHER_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		expect(rows()).toEqual(["Bob Baker", "Cy Cole"]);
		expect(playingCard()).toBeInTheDocument();
	});

	test("with only the active room, shows the empty state and the Playing card below it", () => {
		setQueryResult(api.models.rooms.index.history, [ACTIVE_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		expect(rows()).toHaveLength(0);
		const empty = screen.getByText("No games yet");
		const card = playingCard();
		expect(card).toBeInTheDocument();
		expect(card?.compareDocumentPosition(empty)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
	});

	test("a room starting while the page is open adds no row", async () => {
		setQueryResult(api.models.rooms.index.history, [PAST_ROOM, OTHER_ROOM]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		expect(rows()).toHaveLength(2);

		setQueryResult(api.models.rooms.index.history, [ACTIVE_ROOM, PAST_ROOM, OTHER_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		await tick();
		expect(rows()).toHaveLength(2);
		expect(playingCard()).toBeInTheDocument();
	});

	test("a room that finishes while the page is open stays after the list, in the Playing slot", async () => {
		setQueryResult(api.models.rooms.index.history, [ACTIVE_ROOM, PAST_ROOM, OTHER_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		await tick();

		setQueryResult(api.models.rooms.index.history, [
			{
				...ACTIVE_ROOM,
				status: "closed",
				games: [{ round: 1, createdAt: TODAY, result: "win", mmr: 8 }]
			},
			PAST_ROOM,
			OTHER_ROOM
		]);
		setQueryResult(api.models.rooms.index.active, null);
		await tick();

		expect(playingCard()).not.toBeInTheDocument();
		expect(rows()).toEqual(["Bob Baker", "Cy Cole", "Dee Dunn"]);
	});

	test("with only the active room, its finishing keeps the room and shows no empty state", async () => {
		setQueryResult(api.models.rooms.index.history, [ACTIVE_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		await tick();

		setQueryResult(api.models.rooms.index.history, [
			{
				...ACTIVE_ROOM,
				status: "closed",
				games: [{ round: 1, createdAt: TODAY, result: "win", mmr: 8 }]
			}
		]);
		setQueryResult(api.models.rooms.index.active, null);
		await tick();

		expect(screen.queryByText("No games yet")).not.toBeInTheDocument();
		expect(rows()).toEqual(["Dee Dunn"]);
	});

	test("a second game started in the same visit puts its Playing card above the held room", async () => {
		const NEXT_ROOM: RoomHistoryEntry = { ...ACTIVE_ROOM, code: "JKLM", opponentName: "Eve Ek" };
		setQueryResult(api.models.rooms.index.history, [ACTIVE_ROOM, PAST_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		await tick();

		setQueryResult(api.models.rooms.index.history, [
			NEXT_ROOM,
			{
				...ACTIVE_ROOM,
				status: "closed",
				games: [{ round: 1, createdAt: TODAY, result: "win", mmr: 8 }]
			},
			PAST_ROOM
		]);
		setQueryResult(api.models.rooms.index.active, { code: "JKLM", type: "tictactoe" });
		await tick();

		const held = screen.getByText("Dee Dunn");
		expect(playingCard()?.compareDocumentPosition(held)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(screen.queryByText("Eve Ek")).not.toBeInTheDocument();
	});

	test("lists one row per round under its day, newest first", () => {
		setQueryResult(api.models.rooms.index.history, [
			{
				...PAST_ROOM,
				games: [
					{ round: 2, createdAt: TODAY, result: "win", mmr: 8 },
					{ round: 1, createdAt: YESTERDAY + 2, result: "win", mmr: 8 }
				]
			},
			OTHER_ROOM
		]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings.map((heading) => heading.textContent)).toEqual(["Today", "Yesterday"]);
		const today = within(headings[0].closest("section")!);
		const yesterday = within(headings[1].closest("section")!);
		expect(today.getAllByRole("listitem")).toHaveLength(1);
		expect(yesterday.getAllByRole("listitem")).toHaveLength(2);
		expect(today.getByText("Round 2")).toBeInTheDocument();
	});

	test("a won round shows the game, the opponent, the round, a W badge, and the gain", () => {
		setQueryResult(api.models.rooms.index.history, [PAST_ROOM]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		const row = within(screen.getByRole("listitem"));
		expect(row.getByText("Tic-Tac-Toe")).toBeInTheDocument();
		expect(row.getByText("Bob Baker")).toBeInTheDocument();
		expect(row.getByText("Round 1")).toBeInTheDocument();
		expect(row.getByText("W")).toBeInTheDocument();
		expect(row.getByText("Win")).toBeInTheDocument();
		expect(row.getByText("+8")).toBeInTheDocument();
	});

	test("a loss at the rating floor shows 0", () => {
		setQueryResult(api.models.rooms.index.history, [
			{ ...PAST_ROOM, games: [{ round: 1, createdAt: TODAY, result: "loss", mmr: 0 }] }
		]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.queryByText(/[-\u2212]0/)).not.toBeInTheDocument();
	});

	test("a round without a rating change keeps its slot with a dash", () => {
		setQueryResult(api.models.rooms.index.history, [
			{ ...PAST_ROOM, games: [{ round: 1, createdAt: TODAY, result: "draw", mmr: null }] }
		]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		expect(within(screen.getByRole("listitem")).getByText("—")).toBeInTheDocument();
	});

	test("a room whose second seat never filled shows Waiting for an opponent", () => {
		setQueryResult(api.models.rooms.index.history, [{ ...PAST_ROOM, opponentName: null }]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		expect(screen.getByText("Waiting for an opponent")).toBeInTheDocument();
	});

	test("each round's Replay link has its own name and links to that round", () => {
		setQueryResult(api.models.rooms.index.history, [
			{
				...PAST_ROOM,
				games: [
					{ round: 2, createdAt: TODAY, result: "win", mmr: 8 },
					{ round: 1, createdAt: YESTERDAY, result: "loss", mmr: -8 }
				]
			}
		]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		expect(
			screen.getByRole("link", { name: "Replay Tic-Tac-Toe round 2 vs Bob Baker, room WXYZ" })
		).toHaveAttribute("href", "/tictactoe/WXYZ/2");
		expect(
			screen.getByRole("link", { name: "Replay Tic-Tac-Toe round 1 vs Bob Baker, room WXYZ" })
		).toHaveAttribute("href", "/tictactoe/WXYZ/1");
	});

	test("shows the end reason when the entry has one", () => {
		const room = {
			...PAST_ROOM,
			games: [
				{ round: 1, createdAt: TODAY, result: "loss" as const, mmr: -8, reason: "timeout" as const }
			]
		};
		setQueryResult(api.models.rooms.index.history, [room]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		expect(screen.getByText("Timeout")).toBeInTheDocument();
	});

	test("shows no reason text for an entry without one", () => {
		setQueryResult(api.models.rooms.index.history, [PAST_ROOM]);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		const row = screen.getByRole("listitem");
		expect(row).not.toHaveTextContent(/Timeout|Resigned|Abandoned|undefined|null/);
	});

	test("with no games, says so and leaves new games to the Play nav", () => {
		setQueryResult(api.models.rooms.index.history, []);
		setQueryResult(api.models.rooms.index.active, null);
		render(History);
		expect(screen.getByText("No games yet")).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	test("signed out, asks to sign in with a Sign in button", () => {
		context.auth!.hydrate(null);
		render(History);
		expect(screen.getByText("Sign in to see your games.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});
});
