import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { goto } from "$app/navigation";
import type { Toaster } from "$lib/components/ui";
import { ClerkAuth } from "$lib/services/auth";
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
import {
	checkersEngine,
	type CheckersState
} from "../../../../../convex/models/games/checkers/index.js";
import { idx } from "../../../../../convex/models/games/checkers/rules.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import Checkers from "./checkers.svelte";

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

function signIn() {
	context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
	mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
}

function statusTexts() {
	return screen.getAllByRole("status").map((element) => element.textContent?.trim());
}

beforeEach(() => {
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate(null);
	context.toaster = null;
});

describe("Checkers", () => {
	test("signed out, asks to sign in with a Sign in button", () => {
		render(Checkers, { props: { roomCode: "ABCD" } });
		expect(screen.getByText("Sign in to join this Checkers game.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});

	test("the strips show each seat's board piece, decorative", async () => {
		context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
		mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
		setQueryResult(api.models.rooms.index.get, roomSnapshot(checkersEngine.createInitialState()));
		render(Checkers, { props: { roomCode: "ABCD" } });

		for (const seat of [0, 1] as const) {
			const [cell] = await screen.findAllByRole("button", {
				name: new RegExp(`, ${seat === 0 ? "cyan" : "pink"} man`)
			});
			const boardPiece = cell.querySelector(".shadow-md")!;
			const strip = document.querySelector<HTMLElement>(`[data-slot=strip][data-seat='${seat}']`)!;
			const icon = strip.querySelector("[data-slot=mark] .rounded-full")!;
			expect(icon).toHaveClass("rounded-full", "shadow-md", `bg-seat-${seat}`);
			expect(boardPiece).toHaveClass("rounded-full", "shadow-md", `bg-seat-${seat}`);
			expect(icon.closest("[aria-hidden=true]")).not.toBeNull();
			expect(within(strip).queryByText("●")).not.toBeInTheDocument();
			expect(within(strip).queryByText(`Player ${seat + 1} pieces`)).not.toBeInTheDocument();
		}
	});

	test("the pending piece survives the confirming snapshot", async () => {
		context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
		mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
		const held = deferred<null>();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(held.promise);
		const initial = checkersEngine.createInitialState();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		render(Checkers, { props: { roomCode: "ABCD" } });

		await fireEvent.click(await screen.findByRole("button", { name: "a3, cyan man, can move" }));
		await fireEvent.click(screen.getByRole("button", { name: "b4, empty" }));
		const target = screen.getByRole("button", { name: "b4, cyan man" });
		const piece = target.querySelector(".shadow-md");
		expect(piece).not.toBeNull();

		const confirmed = checkersEngine.applyMove(initial, 0, {
			kind: "checkers",
			from: idx(5, 0),
			to: idx(4, 1)
		});
		setQueryResult(api.models.rooms.index.get, roomSnapshot(confirmed));
		held.resolve(null);
		await tick();

		expect(target).toHaveAccessibleName("b4, cyan man");
		expect(target.querySelector(".shadow-md")).toBe(piece);
	});

	test("a rejected move shows one Move not accepted toast", async () => {
		context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
		mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
		mutationFor(api.models.rooms.index.play).mockRejectedValue(new Error("Not your turn"));
		setQueryResult(api.models.rooms.index.get, roomSnapshot(checkersEngine.createInitialState()));
		render(Checkers, { props: { roomCode: "ABCD" } });

		await fireEvent.click(await screen.findByRole("button", { name: "a3, cyan man, can move" }));
		await fireEvent.click(screen.getByRole("button", { name: "b4, empty" }));
		await vi.waitFor(() => expect(context.toaster!.items).toHaveLength(1));

		expect(context.toaster!.items).toEqual([
			{ id: expect.any(Number), message: "Move not accepted", tone: "error" }
		]);
	});

	test("a failed room query offers a retry and a way back", async () => {
		signIn();
		setQueryError(api.models.rooms.index.get, new Error("Server Error"));
		render(Checkers, { props: { roomCode: "ABCD" } });

		expect(await screen.findByText("Couldn't load this room.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Back to play" })).toHaveAttribute(
			"href",
			"/play?game=checkers"
		);
	});

	test("a tic-tac-toe room opened at round 2 redirects to its tic-tac-toe round 2", async () => {
		signIn();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(tictactoeEngine.createInitialState(), { game: { round: 2, latestRound: 2 } })
		);
		render(Checkers, { props: { roomCode: "ABCD", round: 2 } });

		await vi.waitFor(() =>
			expect(goto).toHaveBeenCalledWith("/tictactoe/ABCD/2", { replaceState: true })
		);
	});

	test("a lowercase room code is replaced with the canonical code", async () => {
		signIn();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(checkersEngine.createInitialState()));
		render(Checkers, { props: { roomCode: "abcd" } });

		await vi.waitFor(() =>
			expect(goto).toHaveBeenCalledWith("/checkers/ABCD", { replaceState: true })
		);
		expect(await screen.findAllByText("ABCD")).not.toHaveLength(0);
	});

	test("scrubbing a won round keeps the live result in the status", async () => {
		signIn();
		// Cyan jumps pink's last piece.
		const lastPiece: CheckersState = {
			kind: "checkers",
			board: Array.from({ length: 64 }, (_, index) => {
				if (index === idx(5, 2)) return { color: "cyan", king: false };
				if (index === idx(4, 3)) return { color: "pink", king: false };
				return null;
			}),
			turn: "cyan",
			mustContinueFrom: null
		};
		const won = checkersEngine.applyMove(lastPiece, 0, {
			kind: "checkers",
			from: idx(5, 2),
			to: idx(3, 4)
		});
		setQueryResult(api.models.rooms.index.get, roomSnapshot(won));
		setQueryResult(api.models.games.index.history, historyOf([lastPiece, won]));
		render(Checkers, { props: { roomCode: "ABCD" } });
		await vi.waitFor(() => expect(statusTexts()).toContain("You won"));

		await fireEvent.keyDown(document.body, { key: "[" });

		expect(screen.getByRole("button", { name: "d4, pink man" })).toBeVisible();
		expect(statusTexts()).toContain("You won");
	});

	test("arrows inside the board move focus without scrubbing, while [ scrubs", async () => {
		signIn();
		const first = checkersEngine.applyMove(checkersEngine.createInitialState(), 0, {
			kind: "checkers",
			from: idx(5, 0),
			to: idx(4, 1)
		});
		const second = checkersEngine.applyMove(first, 1, {
			kind: "checkers",
			from: idx(2, 1),
			to: idx(3, 0)
		});
		setQueryResult(api.models.rooms.index.get, roomSnapshot(second));
		setQueryResult(api.models.games.index.history, historyOf([first, second]));
		render(Checkers, { props: { roomCode: "ABCD" } });
		const board = await screen.findByRole("group", { name: "Checkers board" });
		const tabStops = within(board)
			.getAllByRole("button")
			.filter((button) => button.tabIndex === 0);
		expect(tabStops).toHaveLength(1);

		tabStops[0].focus();
		await fireEvent.keyDown(tabStops[0], { key: "Home" });
		await fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });

		const focused = document.activeElement;
		expect(focused).toHaveAccessibleName("d8, pink man");
		expect(screen.getByRole("button", { name: "a5, pink man" })).toBeVisible();

		await fireEvent.keyDown(focused!, { key: "[" });

		expect(screen.getByRole("button", { name: "a5, empty" })).toBeVisible();
		expect(document.activeElement).toBe(focused);
	});

	test("the board is a group of 32 dark-square buttons, with no grid role", async () => {
		signIn();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(checkersEngine.createInitialState()));
		render(Checkers, { props: { roomCode: "ABCD" } });

		const board = await screen.findByRole("group", { name: "Checkers board" });
		expect(within(board).getAllByRole("button")).toHaveLength(32);
		expect(screen.queryAllByRole("grid")).toHaveLength(0);
	});
});
