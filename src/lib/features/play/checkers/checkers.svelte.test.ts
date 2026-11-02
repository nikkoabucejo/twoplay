import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { Toaster } from "$lib/components/ui";
import { ClerkAuth } from "$lib/services/auth";
import {
	deferred,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { api } from "../../../../../convex/_generated/api.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import { idx } from "../../../../../convex/models/games/checkers/rules.js";
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

beforeEach(() => {
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate(null);
	context.toaster = null;
});

describe("Checkers", () => {
	test("Sign in is disabled when the auth client failed to load", () => {
		context.auth!.loadError = "Failed to load @clerk/ui bundle";
		render(Checkers, { props: { roomCode: "ABCD" } });
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});

	test("Sign in is enabled while signed out", () => {
		render(Checkers, { props: { roomCode: "ABCD" } });
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});

	test("the strips show each seat's board piece, decorative", async () => {
		context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
		mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
		setQueryResult(api.models.rooms.index.get, roomSnapshot(checkersEngine.createInitialState()));
		render(Checkers, { props: { roomCode: "ABCD" } });

		for (const seat of [0, 1] as const) {
			const [cell] = await screen.findAllByRole("button", {
				name: new RegExp(`player ${seat + 1}$`)
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

		await fireEvent.click(await screen.findByRole("button", { name: "Row 6, column 1, player 1" }));
		await fireEvent.click(screen.getByRole("button", { name: "Row 5, column 2, empty" }));
		const target = screen.getByRole("button", { name: "Row 5, column 2, player 1" });
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

		expect(target).toHaveAccessibleName("Row 5, column 2, player 1");
		expect(target.querySelector(".shadow-md")).toBe(piece);
	});

	test("a rejected move shows one Move not accepted toast", async () => {
		context.auth!.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
		mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
		mutationFor(api.models.rooms.index.play).mockRejectedValue(new Error("Not your turn"));
		setQueryResult(api.models.rooms.index.get, roomSnapshot(checkersEngine.createInitialState()));
		render(Checkers, { props: { roomCode: "ABCD" } });

		await fireEvent.click(await screen.findByRole("button", { name: "Row 6, column 1, player 1" }));
		await fireEvent.click(screen.getByRole("button", { name: "Row 5, column 2, empty" }));
		await vi.waitFor(() => expect(context.toaster!.items).toHaveLength(1));

		expect(context.toaster!.items).toEqual([
			{ id: expect.any(Number), message: "Move not accepted", tone: "error" }
		]);
	});
});
