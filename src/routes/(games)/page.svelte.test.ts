import { render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { ClerkAuth } from "$lib/services/auth";
import Page from "./+page.svelte";

vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/state", () => ({ page: { url: new URL("http://localhost/") } }));

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

// Keeps lottie-web inert, as in play.svelte.test.ts: it paints a 1x1 canvas on load, then fetches JSON.
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
	context.auth = new ClerkAuth();
	context.auth.hydrate(null);
});

describe("Home page", () => {
	test("Sign in is disabled when the auth client failed to load", () => {
		context.auth!.loadError = "Failed to load @clerk/ui bundle";
		render(Page);
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});

	test("Sign in is enabled while signed out", () => {
		render(Page);
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});

	test("Signed-out visitors see the games, linked to /play, above Sign in", () => {
		render(Page);
		const tictactoe = screen.getByRole("link", { name: "Tic-Tac-Toe" });
		const checkers = screen.getByRole("link", { name: "Checkers" });
		expect(tictactoe).toHaveAttribute("href", "/play?game=tictactoe");
		expect(checkers).toHaveAttribute("href", "/play?game=checkers");
		const signIn = screen.getByRole("button", { name: "Sign in" });
		expect(
			checkers.compareDocumentPosition(signIn) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	test("renders the site's structured data", () => {
		render(Page);
		const script = document.head.querySelectorAll('script[type="application/ld+json"]');
		expect(script).toHaveLength(1);
		const types = JSON.parse(script[0].textContent!)["@graph"].map(
			(entry: { "@type": string }) => entry["@type"]
		);
		expect(types).toEqual(["WebSite", "WebApplication"]);
	});

	test("Signed-in visitors see the games without a Sign in prompt", () => {
		context.auth!.hydrate({ id: "user_1", email: null, name: null, imageUrl: null });
		render(Page);
		expect(screen.getByRole("link", { name: "Tic-Tac-Toe" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
	});
});
