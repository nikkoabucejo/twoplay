import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import { ClerkAuth } from "$lib/services/auth";
import { resetConvex, setQueryResult } from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import Play from "./play.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

vi.mock("$lib/components/ui", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/components/ui")>()),
	getToaster: () => ({ show: vi.fn() })
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

beforeEach(() => {
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate({ id: "user_ada", email: null, name: "Ada", imageUrl: null });
	setQueryResult(api.models.pairings.index.status, false);
});

function pickerColumn() {
	return screen.getByRole("button", { name: "Find Match" }).closest(".max-w-md");
}

describe("Play", () => {
	test("shows a spinner while checking for an active room", () => {
		render(Play);
		expect(screen.getByRole("status")).toHaveTextContent("Loading");
	});

	test("keeps the picker in the layout, hidden, while checking for an active room", () => {
		render(Play);
		expect(pickerColumn()).toHaveClass("invisible");
	});

	test("centers the spinner over the picker's own box", () => {
		render(Play);
		const overlay = screen.getByRole("status").parentElement;
		expect(overlay).toHaveClass("absolute", "inset-0");
		expect(overlay?.parentElement).toBe(pickerColumn()?.parentElement);
		expect(overlay?.parentElement).toHaveClass("relative", "flex-1", "py-2");
	});

	test("shows the picker once there is no active room", () => {
		setQueryResult(api.models.rooms.index.active, null);
		render(Play);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(pickerColumn()).not.toHaveClass("invisible");
	});

	test("Sign in is disabled when the auth client failed to load", () => {
		context.auth!.hydrate(null);
		context.auth!.loadError = "Failed to load @clerk/ui bundle";
		render(Play);
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});

	test("Sign in is enabled while signed out", () => {
		context.auth!.hydrate(null);
		render(Play);
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});

	test("a signed-in user whose auth client failed to load is asked to reload, not to sign in", async () => {
		const reload = vi.fn();
		const original = globalThis.location;
		vi.stubGlobal("location", { reload });
		context.auth!.isSignedIn = false;
		context.auth!.loadError = "Failed to load @clerk/ui bundle";
		render(Play);
		expect(screen.getByText("Can't reach sign-in. Reload to play.")).toBeInTheDocument();
		expect(screen.queryByText("Sign in to create or join a room.")).not.toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: "Reload" }));
		expect(reload).toHaveBeenCalled();
		vi.stubGlobal("location", original);
	});

	test("the room code field has a name", () => {
		setQueryResult(api.models.rooms.index.active, null);
		render(Play);
		expect(screen.getByRole("textbox", { name: "Room code" })).toBeInTheDocument();
	});

	test("the error line is an empty alert until there is an error", () => {
		setQueryResult(api.models.rooms.index.active, null);
		render(Play);
		const alert = screen.getByRole("alert");
		expect(alert.textContent?.trim()).toBe("");
	});
});
