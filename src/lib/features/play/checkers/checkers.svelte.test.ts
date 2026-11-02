import { render, screen, within } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { ClerkAuth } from "$lib/services/auth";
import {
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { api } from "../../../../../convex/_generated/api.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import Checkers from "./checkers.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

vi.mock("$lib/utils/storage", async (importOriginal) => {
	const storage = await importOriginal<typeof import("$lib/utils/storage")>();
	return { ...storage, getPreferences: () => new storage.PreferencesStore(null) };
});

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

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

	test("the strips show each seat's board piece, read as that player's pieces", async () => {
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
			expect(within(strip).getByText(`Player ${seat + 1} pieces`)).toHaveClass("sr-only");
		}
	});
});
