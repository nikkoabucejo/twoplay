import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { Toaster } from "$lib/components/ui";
import { ClerkAuth } from "$lib/services/auth";
import { playMoveSound } from "$lib/utils/sound";
import {
	deferred,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { api } from "../../../../../convex/_generated/api.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
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

/** Signs Alice in as seat 0 of a fresh room, where it's her move. */
async function renderSeatedRoom() {
	context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
	mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
	setQueryResult(api.models.rooms.index.get, roomSnapshot(tictactoeEngine.createInitialState()));
	render(Tictactoe, { props: { roomCode: "ABCD" } });
	const [firstCell] = await screen.findAllByRole("button", { name: "Cell 1, empty" });
	return firstCell;
}

describe("Tictactoe", () => {
	test("Sign in is disabled when the auth client failed to load", () => {
		context.auth!.loadError = "Failed to load @clerk/ui bundle";
		render(Tictactoe, { props: { roomCode: "ABCD" } });
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});

	test("Sign in is enabled while signed out", () => {
		render(Tictactoe, { props: { roomCode: "ABCD" } });
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

		const cell = await screen.findByRole("button", { name: "Cell 1, X" });
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
		expect(cell).toHaveAccessibleName("Cell 1, X");
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
		await vi.waitFor(() => expect(cell).toHaveAccessibleName("Cell 1, empty"));
		await fireEvent.click(cell);
		await vi.waitFor(() => expect(context.toaster!.items).toHaveLength(2));

		expect(context.toaster!.items).toEqual([
			{ id: expect.any(Number), message: "Move not accepted", tone: "error" },
			{ id: expect.any(Number), message: "Move not accepted", tone: "error" }
		]);
	});
});
