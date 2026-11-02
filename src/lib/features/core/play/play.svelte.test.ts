import { fireEvent, render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import { goto } from "$app/navigation";
import { MoodPresence } from "$lib/features/presence";
import { ClerkAuth } from "$lib/services/auth";
import {
	ALICE,
	deferred,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { PreferencesStore } from "$lib/utils/storage";
import Play from "./play.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const context = vi.hoisted(() => ({
	auth: null as ClerkAuth | null,
	preferences: null as PreferencesStore | null,
	mood: undefined as MoodPresence | undefined
}));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

vi.mock("$lib/components/ui", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/components/ui")>()),
	getToaster: () => ({ show: vi.fn() })
}));

vi.mock("$lib/features/presence", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/features/presence")>()),
	getMood: () => context.mood
}));

vi.mock("$lib/utils/storage", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/utils/storage")>()),
	getPreferences: () => context.preferences
}));

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

let preferences: PreferencesStore;

beforeEach(() => {
	resetConvex();
	vi.mocked(goto).mockClear();
	context.auth = new ClerkAuth();
	context.auth.hydrate({ id: "user_ada", email: null, name: "Ada", imageUrl: null });
	preferences = new PreferencesStore(null);
	context.preferences = preferences;
	context.mood = new MoodPresence();
	setQueryResult(api.models.pairings.index.status, false);
});

afterEach(() => {
	vi.useRealTimers();
});

const createRoom = () => mutationFor(api.models.rooms.index.create);
const enqueue = () => mutationFor(api.models.pairings.index.enqueue);
const cancelPairing = () => mutationFor(api.models.pairings.index.cancel);
const abandonRoom = () => mutationFor(api.models.rooms.index.abandon);

function showSetup(props: Parameters<typeof render<typeof Play>>[1] = {}) {
	setQueryResult(api.models.rooms.index.active, null);
	return render(Play, props);
}

function showWaitingRoom() {
	setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
	setQueryResult(
		api.models.rooms.index.get,
		roomSnapshot(tictactoeEngine.createInitialState(), { players: [ALICE, null] })
	);
	return render(Play);
}

function showQueue() {
	setQueryResult(api.models.pairings.index.status, true);
	return showSetup();
}

function radio(name: string) {
	return screen.getByRole("radio", { name });
}

describe("Play", () => {
	test("shows the setup skeleton while checking for an active room", () => {
		const { container } = render(Play);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
		expect(container.querySelector("[data-loading='play']")).toBeInTheDocument();
		expect(container.querySelector("[data-slot='spinner']")).not.toBeInTheDocument();
	});

	test("signed out, asks to sign in with a Sign in button", () => {
		context.auth!.hydrate(null);
		render(Play);
		expect(screen.getByText("Sign in to create or join a room.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});

	test("a signed-in user whose auth client failed to load is asked to reload, leaving the button to the banner", () => {
		context.auth!.isSignedIn = false;
		context.auth!.loadError = "Failed to load @clerk/ui bundle";
		render(Play);
		expect(screen.getByText("Can't reach sign-in. Reload to play.")).toBeInTheDocument();
		expect(screen.queryByText("Sign in to create or join a room.")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Reload" })).not.toBeInTheDocument();
	});

	test("the page has one h1, New game", () => {
		showSetup();
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("New game");
	});

	test("the room code field has a name", () => {
		showSetup();
		expect(screen.getByRole("textbox", { name: "Room code" })).toBeInTheDocument();
	});

	test("the error line is an empty alert until there is an error", () => {
		showSetup();
		expect(screen.getByRole("alert").textContent?.trim()).toBe("");
	});

	test("a game card shows its open room count only when there are open rooms", () => {
		const entry = { hostName: "Bo", timeControlMs: 300_000, createdAt: 0, isOwn: false };
		setQueryResult(api.models.rooms.index.lobbies, [
			{ ...entry, code: "AAAA", type: "tictactoe" },
			{ ...entry, code: "BBBB", type: "tictactoe" }
		]);
		showSetup();
		expect(radio("Tic-Tac-Toe")).toHaveTextContent("2 open");
		expect(radio("Checkers")).not.toHaveTextContent("open");
	});

	test("each opponent option is described by its hint", () => {
		showSetup();
		expect(radio("A friend")).toHaveAccessibleDescription("Private room. Share a link or code");
	});

	test("the summary names the chosen game, opponent, and clock", async () => {
		showSetup();
		await fireEvent.click(radio("Checkers"));
		await fireEvent.click(radio("Open room"));
		await fireEvent.click(radio("10 min"));
		expect(screen.getByText("Checkers · Open room · 10 min")).toBeInTheDocument();
	});

	test("tic-tac-toe is checked by default", () => {
		showSetup();
		expect(radio("Tic-Tac-Toe")).toBeChecked();
	});

	test("ArrowRight checks and focuses the next game card", async () => {
		showSetup();
		radio("Tic-Tac-Toe").focus();
		await fireEvent.keyDown(radio("Tic-Tac-Toe"), { key: "ArrowRight" });
		expect(radio("Checkers")).toBeChecked();
		expect(radio("Checkers")).toHaveFocus();
	});

	test("End checks the last game card and Home the first", async () => {
		showSetup();
		await fireEvent.keyDown(radio("Tic-Tac-Toe"), { key: "End" });
		expect(radio("Checkers")).toBeChecked();
		await fireEvent.keyDown(radio("Checkers"), { key: "Home" });
		expect(radio("Tic-Tac-Toe")).toBeChecked();
	});

	test("only the checked game card is in the tab order", () => {
		showSetup();
		expect(radio("Tic-Tac-Toe")).toHaveAttribute("tabindex", "0");
		expect(radio("Checkers")).toHaveAttribute("tabindex", "-1");
	});

	test("initialGame checks its card", () => {
		showSetup({ props: { initialGame: "checkers" } });
		expect(radio("Checkers")).toBeChecked();
	});

	test("a stored setup is preselected", () => {
		preferences.setLastPlay({ game: "checkers", opponent: "friend", minutes: 10 });
		showSetup();
		expect(radio("Checkers")).toBeChecked();
		expect(radio("A friend")).toBeChecked();
		expect(radio("10 min")).toBeChecked();
	});

	test("initialGame wins over the stored game", () => {
		preferences.setLastPlay({ game: "checkers", opponent: "friend", minutes: 10 });
		showSetup({ props: { initialGame: "tictactoe" } });
		expect(radio("Tic-Tac-Toe")).toBeChecked();
		expect(radio("A friend")).toBeChecked();
	});

	test("Anyone joins the matchmaking queue with the chosen game and clock", async () => {
		showSetup();
		await fireEvent.click(radio("Checkers"));
		await fireEvent.click(radio("3 min"));
		await fireEvent.click(screen.getByRole("button", { name: "Find match" }));
		expect(enqueue()).toHaveBeenCalledWith({ type: "checkers", timeControlMs: 180_000 });
	});

	test("A friend creates a private room", async () => {
		showSetup();
		await fireEvent.click(radio("A friend"));
		await fireEvent.click(screen.getByRole("button", { name: "Create room" }));
		expect(createRoom()).toHaveBeenCalledWith(
			expect.objectContaining({ type: "tictactoe", visibility: "private" })
		);
	});

	test("Open room creates a public room", async () => {
		showSetup();
		await fireEvent.click(radio("Open room"));
		await fireEvent.click(screen.getByRole("button", { name: "Create room" }));
		expect(createRoom()).toHaveBeenCalledWith(expect.objectContaining({ visibility: "public" }));
	});

	test("starting stores the setup", async () => {
		showSetup();
		await fireEvent.click(radio("Checkers"));
		await fireEvent.click(radio("Open room"));
		await fireEvent.click(radio("3 min"));
		await fireEvent.click(screen.getByRole("button", { name: "Create room" }));
		expect(preferences.lastPlay).toEqual({
			game: "checkers",
			opponent: "open",
			minutes: 3
		});
	});

	test("Create room reads Creating… and is disabled while the call is pending", async () => {
		createRoom().mockReturnValueOnce(deferred<unknown>().promise);
		showSetup();
		await fireEvent.click(radio("A friend"));
		await fireEvent.click(screen.getByRole("button", { name: "Create room" }));
		expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
	});

	test("Find match reads Finding… and is disabled while the call is pending", async () => {
		enqueue().mockReturnValueOnce(deferred<unknown>().promise);
		showSetup();
		await fireEvent.click(screen.getByRole("button", { name: "Find match" }));
		expect(screen.getByRole("button", { name: "Finding…" })).toBeDisabled();
	});

	test("a one-seat active room shows the waiting room with its code", () => {
		showWaitingRoom();
		expect(screen.getByText("Waiting for your opponent…")).toBeInTheDocument();
		expect(screen.getByText("ABCD")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
	});

	test("the waiting room has no Share button without Web Share", () => {
		showWaitingRoom();
		expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
	});

	test("the waiting room offers Share where Web Share exists", () => {
		vi.stubGlobal("navigator", { ...navigator, share: vi.fn() });
		showWaitingRoom();
		expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
		vi.unstubAllGlobals();
	});

	test("Cancel room abandons the room", async () => {
		showWaitingRoom();
		await fireEvent.click(screen.getByRole("button", { name: "Cancel room" }));
		expect(abandonRoom()).toHaveBeenCalledWith({ code: "ABCD" });
	});

	test("a waiting room shown on load opens the room when the second seat fills", async () => {
		showWaitingRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(tictactoeEngine.createInitialState()));
		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith("/tictactoe/ABCD"));
	});

	test("an active two-seat room found on load shows the Playing card without navigating", () => {
		setQueryResult(api.models.rooms.index.active, { code: "ABCD", type: "tictactoe" });
		setQueryResult(api.models.rooms.index.get, roomSnapshot(tictactoeEngine.createInitialState()));
		render(Play);
		expect(screen.getByRole("button", { name: "Abandon" })).toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();
	});

	test("the queue view shows the game, clock, and an elapsed timer", async () => {
		vi.useFakeTimers();
		preferences.setLastPlay({ game: "checkers", opponent: "anyone", minutes: 3 });
		showQueue();
		expect(screen.getByText("Checkers · 3 min")).toBeInTheDocument();
		expect(screen.getByText("00:00")).toBeInTheDocument();
		await vi.advanceTimersByTimeAsync(75_000);
		expect(screen.getByText("01:15")).toBeInTheDocument();
	});

	test("the queue view hides the game choices along with the rest of the setup", () => {
		showQueue();
		expect(radio("Tic-Tac-Toe").closest(".invisible")).toBe(
			radio("A friend").closest(".invisible")
		);
		expect(radio("Tic-Tac-Toe").closest(".invisible")).not.toBeNull();
	});

	test("Cancel leaves the queue", async () => {
		showQueue();
		await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(cancelPairing()).toHaveBeenCalled();
	});

	test("Play a friend instead leaves the queue and selects A friend", async () => {
		showQueue();
		await fireEvent.click(screen.getByRole("button", { name: "Play a friend instead" }));
		expect(cancelPairing()).toHaveBeenCalled();
		expect(radio("A friend")).toBeChecked();
	});

	test("unmounting while queued leaves the queue", () => {
		const { unmount } = showQueue();
		unmount();
		expect(cancelPairing()).toHaveBeenCalled();
	});

	test("pagehide while queued leaves the queue", () => {
		showQueue();
		window.dispatchEvent(new Event("pagehide"));
		expect(cancelPairing()).toHaveBeenCalled();
	});

	test("unmounting outside the queue leaves nothing", () => {
		const { unmount } = showSetup();
		unmount();
		expect(cancelPairing()).not.toHaveBeenCalled();
	});

	test("the background is searching while queued", () => {
		showQueue();
		expect(context.mood!.searching).toBe(true);
	});

	test("the background stops searching once the queue is left", async () => {
		showQueue();
		await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		setQueryResult(api.models.pairings.index.status, false);
		flushSync();
		expect(context.mood!.searching).toBe(false);
	});

	test("the background stops searching when the page unmounts", () => {
		const { unmount } = showQueue();
		unmount();
		expect(context.mood!.searching).toBe(false);
	});

	test("the setup view leaves the background neutral", () => {
		showSetup();
		expect(context.mood!.searching).toBe(false);
	});

	test("the queue view works without an ambient background", () => {
		context.mood = undefined;
		showQueue();
		expect(screen.getByText("Finding a match")).toBeInTheDocument();
	});

	test("the search radar is hidden from assistive technology", () => {
		showQueue();
		const timerBox = screen.getByText("00:00").parentElement!;
		const decorations = [...timerBox.children].filter((child) => !child.textContent?.trim());
		expect(decorations).not.toHaveLength(0);
		for (const decoration of decorations) expect(decoration).toHaveAttribute("aria-hidden", "true");
		expect(screen.getByText("Finding a match").closest("[aria-live='polite']")).not.toBeNull();
	});
});
