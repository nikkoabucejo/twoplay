import { render, screen, within } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { ClerkAuth } from "$lib/services/auth";
import { resetConvex } from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import Page from "./+page.svelte";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
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
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate(null);
});

function signIn() {
	context.auth!.hydrate({ id: "user_1", email: null, name: null, imageUrl: null });
}

function expectGameCards() {
	const tictactoe = screen.getByRole("link", { name: /^Tic-Tac-Toe/ });
	const checkers = screen.getByRole("link", { name: /^Checkers/ });
	const chess = screen.getByRole("link", { name: /^Chess/ });
	expect(tictactoe).toHaveAttribute("href", "/play?game=tictactoe");
	expect(tictactoe).toHaveTextContent("Nine boards. Win three in a row.");
	expect(checkers).toHaveAttribute("href", "/play?game=checkers");
	expect(checkers).toHaveTextContent("Jump and crown on an 8x8 board.");
	expect(chess).toHaveAttribute("href", "/play?game=chess");
	expect(chess).toHaveTextContent("Checkmate the king to win.");
}

describe("Home page", () => {
	test("has the wordmark as its only h1", () => {
		render(Page);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TWOPLAY");
	});

	test("game cards link to /play with the game preselected when signed out", () => {
		render(Page);
		expectGameCards();
	});

	test("game cards link to /play with the game preselected when signed in", () => {
		signIn();
		render(Page);
		expectGameCards();
	});

	test("shows three how-it-works steps when signed out", () => {
		render(Page);
		const steps = screen.getByRole("list", { name: "How it works" });
		expect(within(steps).getAllByRole("listitem")).toHaveLength(3);
	});

	test("hides how it works when signed in", () => {
		signIn();
		render(Page);
		expect(screen.queryByRole("heading", { name: "How it works" })).not.toBeInTheDocument();
	});

	test("signed out, has no buttons of its own", () => {
		render(Page);
		expect(screen.queryAllByRole("button")).toHaveLength(0);
	});

	test("signed in, the game cards are its only links", () => {
		signIn();
		render(Page);
		expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
			"/play?game=tictactoe",
			"/play?game=checkers",
			"/play?game=chess"
		]);
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
});
