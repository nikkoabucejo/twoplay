import { render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import { ClerkAuth } from "$lib/services/auth";
import {
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import Lobby from "./lobby.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

const OPEN_ROOM = {
	code: "WXYZ",
	type: "tictactoe" as const,
	hostName: "Bob Baker",
	timeControlMs: 300_000,
	createdAt: 1,
	isOwn: false
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

function isPlayingShown() {
	return screen.queryByRole("button", { name: "Abandon" }) !== null;
}

describe("Lobby", () => {
	test("shows the feed skeleton while the open rooms load", () => {
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(Lobby);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
		expect(isPlayingShown()).toBe(false);
	});

	test("shows the feed skeleton while the active room loads", () => {
		setQueryResult(api.models.rooms.index.lobbies, [OPEN_ROOM]);
		render(Lobby);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
		expect(isPlayingShown()).toBe(false);
		expect(screen.queryByText("Hosted by Bob Baker")).not.toBeInTheDocument();
	});

	test("shows the active room and the open rooms together once both load", () => {
		setQueryResult(api.models.rooms.index.lobbies, [OPEN_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(Lobby);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(isPlayingShown()).toBe(true);
		expect(screen.getByText("Hosted by Bob Baker")).toBeInTheDocument();
	});

	test("puts the active room after the feed, so its arrival never pushes the list down", () => {
		setQueryResult(api.models.rooms.index.lobbies, [OPEN_ROOM]);
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		render(Lobby);
		const list = screen.getByText("Hosted by Bob Baker");
		const card = screen.getByRole("button", { name: "Abandon" });
		expect(card.compareDocumentPosition(list)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
	});

	test("shows only the open rooms when there is no active room", () => {
		setQueryResult(api.models.rooms.index.lobbies, [OPEN_ROOM]);
		setQueryResult(api.models.rooms.index.active, null);
		render(Lobby);
		expect(isPlayingShown()).toBe(false);
		expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
	});

	test("an empty lobby says so and leaves new games to the Play nav", () => {
		setQueryResult(api.models.rooms.index.lobbies, []);
		setQueryResult(api.models.rooms.index.active, null);
		render(Lobby);
		expect(screen.getByText("No open rooms right now")).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	test("signed out, asks to sign in with a Sign in button", () => {
		context.auth!.hydrate(null);
		render(Lobby);
		expect(screen.getByText("Sign in to browse open rooms.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});

	test("your own open room shows as waiting, with no link beside the header's live-game pill", () => {
		setQueryResult(api.models.rooms.index.lobbies, [{ ...OPEN_ROOM, isOwn: true }]);
		setQueryResult(api.models.rooms.index.active, null);
		render(Lobby);
		expect(screen.getByText("Waiting")).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Join" })).not.toBeInTheDocument();
	});

	test("keeps a room's clock beside the host name, so a long name truncates instead", () => {
		setQueryResult(api.models.rooms.index.lobbies, [OPEN_ROOM]);
		setQueryResult(api.models.rooms.index.active, null);
		render(Lobby);
		expect(screen.getByText("Hosted by Bob Baker")).toHaveClass("truncate");
		expect(screen.getByText("5 min")).toHaveClass("whitespace-nowrap");
	});
});
