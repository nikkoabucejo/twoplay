import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
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

const PAST_ROOM: RoomHistoryEntry = {
	code: "WXYZ",
	type: "tictactoe",
	status: "closed",
	opponentName: "Bob Baker",
	games: [{ round: 1, createdAt: 1, result: "win", mmr: 12 }]
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
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate({ id: "user_ada", email: null, name: "Ada", imageUrl: null });
	setQueryResult(api.models.rooms.index.get, roomSnapshot(tictactoeEngine.createInitialState()));
});

const OTHER_ROOM: RoomHistoryEntry = {
	code: "QRST",
	type: "checkers",
	status: "closed",
	opponentName: "Cy Cole",
	games: [{ round: 1, createdAt: 2, result: "loss", mmr: -9 }]
};

const ACTIVE_ROOM: RoomHistoryEntry = {
	code: "ABCD",
	type: "tictactoe",
	status: "active",
	opponentName: "Dee Dunn",
	games: [{ round: 1, createdAt: 3, result: "playing", mmr: null }]
};

function rows() {
	return screen.queryAllByText(/^You vs /);
}

function playingCard() {
	return screen.queryByRole("link", { name: "Play" });
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
		expect(screen.queryByText("You vs Bob Baker")).not.toBeInTheDocument();
	});

	test("shows the active room and the history together once both load", () => {
		setQueryResult(api.models.rooms.index.history, [PAST_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(playingCard()).toBeInTheDocument();
		expect(screen.getByText("You vs Bob Baker")).toBeInTheDocument();
	});

	test("puts the active room after the feed, so its arrival never pushes the list down", () => {
		setQueryResult(api.models.rooms.index.history, [PAST_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(History);
		const list = screen.getByText("You vs Bob Baker");
		const card = playingCard();
		expect(card?.compareDocumentPosition(list)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
	});

	test("an in-progress game only pulses when motion is allowed", () => {
		setQueryResult(api.models.rooms.index.history, [
			{ ...PAST_ROOM, games: [{ round: 1, createdAt: 1, result: "playing", mmr: null }] }
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
		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			"You vs Bob Baker",
			"You vs Cy Cole"
		]);
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

	test("Sign in is disabled when the auth client failed to load", () => {
		context.auth!.hydrate(null);
		context.auth!.loadError = "Failed to load @clerk/ui bundle";
		render(History);
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});

	test("Sign in is enabled while signed out", () => {
		context.auth!.hydrate(null);
		render(History);
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});
});
