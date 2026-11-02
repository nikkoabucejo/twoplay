import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { goto } from "$app/navigation";
import type { Toaster } from "$lib/components/ui";
import { ClerkAuth } from "$lib/services/auth";
import { playMoveSound } from "$lib/utils/sound";
import {
	deferred,
	historyOf,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryError,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { api } from "../../../../../convex/_generated/api.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import {
	tictactoeEngine,
	type TictactoeState
} from "../../../../../convex/models/games/tictactoe/index.js";
import Tictactoe from "./tictactoe.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

vi.mock("$lib/utils/storage", async (importOriginal) => {
	const storage = await importOriginal<typeof import("$lib/utils/storage")>();
	return { ...storage, getPreferences: () => new storage.PreferencesStore(null) };
});

vi.mock("$lib/utils/sound", () => ({
	prepareSound: vi.fn(),
	playMoveSound: vi.fn(),
	playCaptureSound: vi.fn(),
	playTurnChime: vi.fn()
}));

const context = vi.hoisted(() => ({
	auth: null as ClerkAuth | null,
	toaster: null as Toaster | null
}));

// A real Toaster per test, made here because importing the mocked barrel's values bypasses the mock.
vi.mock("$lib/components/ui", async (importOriginal) => {
	const ui = await importOriginal<typeof import("$lib/components/ui")>();
	return { ...ui, getToaster: () => (context.toaster ??= new ui.Toaster()) };
});

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

// Keep the real lottie-web inert, as in board.svelte.test.ts: it paints a canvas, then fetches JSON.
beforeAll(() => {
	const proxyImageContext = { fillStyle: "", fillRect() {} } as unknown as CanvasRenderingContext2D;
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(proxyImageContext);
	vi.stubGlobal(
		"XMLHttpRequest",
		class {
			open() {}
			send() {}
		}
	);
});

beforeEach(() => {
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate(null);
	context.toaster = null;
});

const FIRST_MOVE = { kind: "tictactoe" as const, boardIndex: 0, cellIndex: 0 };
const FIRST_CELL = "Board 1 (top left), cell 1";

function signIn() {
	context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
	mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
}

function played(...moves: [boardIndex: number, cellIndex: number][]): TictactoeState[] {
	const states: TictactoeState[] = [];
	moves.reduce((state, [boardIndex, cellIndex], turn) => {
		const next = tictactoeEngine.applyMove(state, turn % 2, {
			kind: "tictactoe",
			boardIndex,
			cellIndex
		});
		states.push(next);
		return next;
	}, tictactoeEngine.createInitialState());
	return states;
}

function statusTexts() {
	return screen.getAllByRole("status").map((element) => element.textContent?.trim());
}

/** Signs Alice in as seat 0 of a fresh room, where it's her move. */
async function renderSeatedRoom() {
	signIn();
	setQueryResult(api.models.rooms.index.get, roomSnapshot(tictactoeEngine.createInitialState()));
	render(Tictactoe, { props: { roomCode: "ABCD" } });
	return screen.findByRole("button", { name: `${FIRST_CELL} — empty, playable` });
}

describe("Tictactoe", () => {
	test("signed out, asks to sign in with a Sign in button", () => {
		render(Tictactoe, { props: { roomCode: "ABCD" } });
		expect(screen.getByText("Sign in to join this Tic-Tac-Toe game.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});

	test("the strips show the board's own X and O marks, read as X and O", async () => {
		context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
		mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
		const state = tictactoeEngine.applyMove(tictactoeEngine.createInitialState(), 0, {
			kind: "tictactoe",
			boardIndex: 0,
			cellIndex: 0
		});
		setQueryResult(api.models.rooms.index.get, roomSnapshot(state));
		render(Tictactoe, { props: { roomCode: "ABCD" } });

		const cell = await screen.findByRole("button", { name: `${FIRST_CELL} — X` });
		const seat0 = document.querySelector<HTMLElement>("[data-slot=strip][data-seat='0']")!;
		const seat1 = document.querySelector<HTMLElement>("[data-slot=strip][data-seat='1']")!;
		const icon = seat0.querySelector("[data-slot=mark] svg")!;
		expect(icon.innerHTML).toBe(cell.querySelector("svg")!.innerHTML);
		expect(icon.firstElementChild?.namespaceURI).toBe("http://www.w3.org/2000/svg");
		expect(icon.closest("[aria-hidden=true]")).not.toBeNull();
		expect(seat0.querySelector("[data-slot=mark]")).toHaveClass("text-seat-0");
		expect(within(seat0).getByText("X")).toHaveClass("sr-only");
		expect(seat1.querySelector("[data-slot=mark] svg circle")).not.toBeNull();
		expect(within(seat1).getByText("O")).toHaveClass("sr-only");
	});

	test("the pending mark and its sound survive the confirming snapshot", async () => {
		const play = mutationFor(api.models.rooms.index.play);
		const held = deferred<null>();
		play.mockReturnValueOnce(held.promise);
		const cell = await renderSeatedRoom();

		await fireEvent.click(cell);
		const mark = cell.querySelector("svg");
		expect(cell).toHaveAccessibleName(`${FIRST_CELL} — X`);
		expect(mark).not.toBeNull();

		const confirmed = tictactoeEngine.applyMove(
			tictactoeEngine.createInitialState(),
			0,
			FIRST_MOVE
		);
		setQueryResult(api.models.rooms.index.get, roomSnapshot(confirmed));
		held.resolve(null);
		await tick();

		expect(cell.querySelectorAll("svg")).toHaveLength(1);
		expect(cell.querySelector("svg")).toBe(mark);
		expect(playMoveSound).toHaveBeenCalledOnce();
	});

	test("each rejected move shows one Move not accepted toast", async () => {
		const play = mutationFor(api.models.rooms.index.play);
		play.mockRejectedValue(new Error("Not your turn"));
		const cell = await renderSeatedRoom();

		await fireEvent.click(cell);
		await vi.waitFor(() => expect(context.toaster!.items).toHaveLength(1));
		await vi.waitFor(() => expect(cell).toHaveAccessibleName(`${FIRST_CELL} — empty, playable`));
		await fireEvent.click(cell);
		await vi.waitFor(() => expect(context.toaster!.items).toHaveLength(2));

		expect(context.toaster!.items).toEqual([
			{ id: expect.any(Number), message: "Move not accepted", tone: "error" },
			{ id: expect.any(Number), message: "Move not accepted", tone: "error" }
		]);
	});

	test("a failed room query offers a retry and a way back", async () => {
		signIn();
		setQueryError(api.models.rooms.index.get, new Error("Server Error"));
		render(Tictactoe, { props: { roomCode: "ABCD" } });

		expect(await screen.findByText("Couldn't load this room.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Back to play" })).toHaveAttribute(
			"href",
			"/play?game=tictactoe"
		);
	});

	test("a checkers room opened at round 2 redirects to its checkers round 2", async () => {
		signIn();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(checkersEngine.createInitialState(), {
				game: { round: 2, latestRound: 2 }
			})
		);
		render(Tictactoe, { props: { roomCode: "ABCD", round: 2 } });

		await vi.waitFor(() =>
			expect(goto).toHaveBeenCalledWith("/checkers/ABCD/2", { replaceState: true })
		);
	});

	test("a lowercase room code is replaced with the canonical code, keeping the round", async () => {
		signIn();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(tictactoeEngine.createInitialState(), { game: { round: 2, latestRound: 2 } })
		);
		render(Tictactoe, { props: { roomCode: "abcd", round: 2 } });

		await vi.waitFor(() =>
			expect(goto).toHaveBeenCalledWith("/tictactoe/ABCD/2", { replaceState: true })
		);
		expect(await screen.findAllByText("ABCD")).not.toHaveLength(0);
		expect(screen.queryByText("abcd")).not.toBeInTheDocument();
	});

	test("scrubbing a won round keeps the live result in the status", async () => {
		signIn();
		// X takes boards 1, 2, and 3 in a row while O spreads over boards 7 to 9.
		const moves = played(
			[0, 0],
			[6, 0],
			[1, 0],
			[7, 0],
			[0, 1],
			[8, 0],
			[1, 1],
			[6, 4],
			[0, 2],
			[7, 4],
			[1, 2],
			[8, 4],
			[2, 0],
			[6, 5],
			[3, 0],
			[7, 5],
			[2, 1],
			[8, 5],
			[3, 1],
			[6, 7],
			[2, 2]
		);
		setQueryResult(api.models.rooms.index.get, roomSnapshot(moves[moves.length - 1]));
		setQueryResult(api.models.games.index.history, historyOf(moves));
		render(Tictactoe, { props: { roomCode: "ABCD" } });
		await vi.waitFor(() => expect(statusTexts()).toContain("You won"));

		await fireEvent.keyDown(document.body, { key: "[" });

		expect(
			screen.getByRole("button", { name: "Board 3 (top right), cell 3 — empty" })
		).toBeVisible();
		expect(statusTexts()).toContain("You won");
	});

	test("arrows inside the board move focus without scrubbing, while [ scrubs", async () => {
		signIn();
		const moves = played([0, 0], [1, 0], [2, 0]);
		setQueryResult(api.models.rooms.index.get, roomSnapshot(moves[2], { myIndex: 1 }));
		setQueryResult(api.models.games.index.history, historyOf(moves));
		render(Tictactoe, { props: { roomCode: "ABCD" } });
		const board = await screen.findByRole("group", { name: "Tic-tac-toe board" });
		const tabStops = within(board)
			.getAllByRole("button")
			.filter((button) => button.tabIndex === 0);
		expect(tabStops).toHaveLength(1);

		tabStops[0].focus();
		await fireEvent.keyDown(tabStops[0], { key: "Home" });
		await fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });

		const focused = document.activeElement;
		expect(focused).toHaveAccessibleName("Board 1 (top left), cell 2 — empty, playable");
		expect(screen.getByRole("button", { name: "Board 3 (top right), cell 1 — X" })).toBeVisible();

		await fireEvent.keyDown(focused!, { key: "[" });

		expect(
			screen.getByRole("button", { name: "Board 3 (top right), cell 1 — empty" })
		).toBeVisible();
		expect(document.activeElement).toBe(focused);
	});

	test("the board is a group of nine named mini-board groups, with no grid role", async () => {
		await renderSeatedRoom();

		const board = screen.getByRole("group", { name: "Tic-tac-toe board" });
		const miniBoards = within(board).getAllByRole("group");
		expect(miniBoards.map((group) => group.getAttribute("aria-label"))).toEqual([
			"Board 1 (top left)",
			"Board 2 (top center)",
			"Board 3 (top right)",
			"Board 4 (middle left)",
			"Board 5 (center)",
			"Board 6 (middle right)",
			"Board 7 (bottom left)",
			"Board 8 (bottom center)",
			"Board 9 (bottom right)"
		]);
		for (const group of miniBoards) expect(within(group).getAllByRole("button")).toHaveLength(9);
		expect(screen.queryAllByRole("grid")).toHaveLength(0);
	});

	test("board cells sit inside a click-sound opt-out region", async () => {
		await renderSeatedRoom();

		const board = screen.getByRole("group", { name: "Tic-tac-toe board" });
		expect(board).toHaveAttribute("data-sfx", "off");
		for (const group of within(board).getAllByRole("group")) {
			expect(group).toHaveAttribute("data-sfx", "off");
		}
		const cell = within(board).getAllByRole("button")[0];
		expect(cell.closest('[data-sfx="off"]')).not.toBeNull();
	});

	test("the Rules popover links to the tic-tac-toe Learn page", async () => {
		await renderSeatedRoom();

		const [trigger] = screen.getAllByRole("button", { name: "Rules" });
		await fireEvent.click(trigger);
		expect(await screen.findByRole("link", { name: "Learn the rules" })).toHaveAttribute(
			"href",
			"/learn/tictactoe"
		);
	});
});
