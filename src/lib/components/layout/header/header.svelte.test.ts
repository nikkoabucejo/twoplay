import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ClerkAuth, type ClerkProfile } from "$lib/services/auth";
import { NAV_ITEMS, SUPPORT_URL } from "$lib/utils/navigation";
import { Header } from "./index.js";

vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

const ADA: ClerkProfile = { id: "user_ada", email: null, name: "Ada", imageUrl: null };

beforeEach(() => {
	context.auth = new ClerkAuth();
});

function renderHeader({
	profile = null,
	live = null
}: { profile?: ClerkProfile; live?: { href: string; name: string } | null } = {}) {
	const auth = context.auth as ClerkAuth;
	auth.hydrate(profile);
	render(Header, { props: { pathname: "/history", live } });
	return auth;
}

/** The state `ClerkAuth.load` leaves after the auth UI bundle fails to load. */
function failLoad(auth: ClerkAuth) {
	auth.loadError = "Failed to load @clerk/ui bundle";
	auth.isSignedIn = false;
	auth.profile = null;
}

async function openAccountMenu() {
	await fireEvent.keyDown(screen.getByRole("button", { name: /Ada/ }), { key: "Enter" });
}

describe("Header", () => {
	test("the wordmark links home", () => {
		renderHeader();
		expect(screen.getByRole("link", { name: "twoplay" })).toHaveAttribute("href", "/");
	});

	test("the wordmark is the only link home", () => {
		renderHeader({ profile: ADA });
		const home = screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/");
		expect(home).toEqual([screen.getByRole("link", { name: "twoplay" })]);
	});

	test("signed out shows Sign in and no member links", () => {
		renderHeader();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
		for (const name of ["Play", "Lobby", "History", "Leaderboard"]) {
			expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
		}
	});

	test("Sign in opens the sign-in flow", async () => {
		const signIn = vi.spyOn(renderHeader(), "signIn");
		await fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
		expect(signIn).toHaveBeenCalledOnce();
	});

	test("Sign in is disabled when the auth client failed to load", () => {
		context.auth = new ClerkAuth();
		context.auth.loadError = "Failed to load @clerk/ui bundle";
		renderHeader();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});

	test("signed in shows the member links with the current page marked", () => {
		renderHeader({ profile: ADA });
		expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "Lobby" })).not.toHaveAttribute("aria-current");
		expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
	});

	test("the member links are exactly the nav items, hidden below sm where the dock takes over", () => {
		renderHeader({ profile: ADA });
		const nav = screen.getByRole("navigation", { name: "Main" });
		const hrefs = within(nav)
			.getAllByRole("link")
			.map((link) => link.getAttribute("href"));
		expect(hrefs).toEqual(NAV_ITEMS.map((item) => item.href));
		expect(nav).toHaveClass("hidden", "sm:flex");
	});

	test("the avatar button is named after the user", () => {
		renderHeader({ profile: ADA });
		expect(screen.getByRole("button", { name: /Ada/ })).toBeInTheDocument();
	});

	test("Account opens the user profile", async () => {
		const openUserProfile = vi.spyOn(renderHeader({ profile: ADA }), "openUserProfile");
		await openAccountMenu();
		await fireEvent.click(screen.getByRole("menuitem", { name: "Account" }));
		expect(openUserProfile).toHaveBeenCalledOnce();
	});

	test("Sign out signs the user out", async () => {
		const signOut = vi.spyOn(renderHeader({ profile: ADA }), "signOut");
		await openAccountMenu();
		await fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
		expect(signOut).toHaveBeenCalledOnce();
	});

	test("the avatar menu has only Account and Sign out, and no Support link", async () => {
		renderHeader({ profile: ADA });
		await openAccountMenu();
		const items = screen.getAllByRole("menuitem").map((item) => item.textContent?.trim());
		expect(items).toEqual(["Account", "Sign out"]);
		expect(
			screen.queryAllByRole("link").filter((link) => link.getAttribute("href") === SUPPORT_URL)
		).toHaveLength(0);
	});

	test("the live-game pill links to the room and names the game", () => {
		renderHeader({ profile: ADA, live: { href: "/tictactoe/ABCD", name: "Tic-Tac-Toe" } });
		expect(screen.getByRole("link", { name: /Tic-Tac-Toe/ })).toHaveAttribute(
			"href",
			"/tictactoe/ABCD"
		);
	});

	test("there is no pill without a live game", () => {
		renderHeader({ profile: ADA });
		expect(screen.queryByRole("link", { name: /live game/i })).not.toBeInTheDocument();
	});

	function rightGroup() {
		return screen.getByRole("banner").lastElementChild as HTMLElement;
	}

	function authSlot() {
		return rightGroup().querySelector<HTMLElement>('[data-slot="auth"]');
	}

	test("after a failed load for a signed-in render, the member links stay and Sign in is disabled", () => {
		const auth = context.auth as ClerkAuth;
		auth.hydrate(ADA);
		failLoad(auth);
		render(Header, { props: { pathname: "/history", live: null } });
		const hrefs = within(screen.getByRole("navigation", { name: "Main" }))
			.getAllByRole("link")
			.map((link) => link.getAttribute("href"));
		expect(hrefs).toEqual(NAV_ITEMS.map((item) => item.href));
		const signIn = screen.getByRole("button", { name: "Sign in" });
		expect(signIn).toBeDisabled();
		expect(rightGroup().lastElementChild?.lastElementChild).toBe(signIn);
		expect(screen.queryByRole("button", { name: /Ada/ })).not.toBeInTheDocument();
	});

	test("the auth control sits in one fixed-width slot with the same box in every auth state", () => {
		const states: [string, () => void, RegExp][] = [
			["signed in", () => context.auth?.hydrate(ADA), /Ada/],
			["signed out", () => context.auth?.hydrate(null), /^Sign in$/],
			[
				"failed load",
				() => {
					context.auth?.hydrate(ADA);
					if (context.auth) failLoad(context.auth);
				},
				/^Sign in$/
			]
		];
		const classLists = states.map(([, setUp, name]) => {
			context.auth = new ClerkAuth();
			setUp();
			const { unmount } = render(Header, { props: { pathname: "/history", live: null } });
			const slot = authSlot();
			expect(slot).not.toBeNull();
			expect(screen.getByRole("button", { name }).parentElement).toBe(slot);
			expect(rightGroup().lastElementChild).toBe(slot);
			const classes = slot?.className ?? "";
			unmount();
			return classes;
		});
		expect(new Set(classLists).size).toBe(1);
		const classes = classLists[0].split(" ");
		expect(classes).toEqual(expect.arrayContaining(["shrink-0", "justify-end"]));
		expect(classes.some((name) => /^w-\d+$/.test(name))).toBe(true);
	});

	test("the right group spans the free space and the live-game pill sits inside it before the auth slot", () => {
		renderHeader({ profile: ADA, live: { href: "/tictactoe/ABCD", name: "Tic-Tac-Toe" } });
		expect(rightGroup()).toHaveClass("min-w-0", "flex-1", "justify-end");
		const pill = screen.getByRole("link", { name: /Tic-Tac-Toe/ });
		expect(pill.parentElement).toBe(rightGroup());
		expect(pill.nextElementSibling).toBe(authSlot());
	});

	test("the live-game pill truncates its label on one line", () => {
		renderHeader({ profile: ADA, live: { href: "/tictactoe/ABCD", name: "Tic-Tac-Toe" } });
		const pill = screen.getByRole("link", { name: /Tic-Tac-Toe/ });
		expect(pill).toHaveClass("min-w-0");
		const label = pill.lastElementChild;
		expect(label).toHaveTextContent("Tic-Tac-Toe");
		// `truncate` sets white-space: nowrap along with the ellipsis.
		expect(label).toHaveClass("truncate");
	});

	test("no markup references storage.ko-fi.com", async () => {
		renderHeader({ profile: ADA });
		await openAccountMenu();
		expect(document.documentElement.outerHTML).not.toContain("storage.ko-fi.com");
	});
});
