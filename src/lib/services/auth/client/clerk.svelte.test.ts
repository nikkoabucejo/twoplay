import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ClerkAuth } from "./clerk.svelte.js";

const clerk = vi.hoisted(() => {
	const mock = {
		constructed: vi.fn(),
		notify: () => {},
		instance: {
			isSignedIn: true,
			user: null,
			session: { getToken: async () => "token" },
			load: async () => {},
			addListener: (listener: () => void) => {
				mock.notify = listener;
			}
		}
	};
	return mock;
});

vi.mock("@clerk/clerk-js", () => ({
	Clerk: class {
		constructor(key: string) {
			clerk.constructed(key);
			return clerk.instance;
		}
	}
}));

vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));

const PROFILE = { id: "user_1", email: null, name: "Alice", imageUrl: null };

const KEY = `pk_test_${btoa("clerk.example.com$")}`;

let isScriptBlocked = false;

beforeEach(() => {
	isScriptBlocked = false;
	// jsdom never fetches external scripts, so settle the injected <script> by hand.
	const appendChild = document.head.appendChild.bind(document.head);
	vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
		const script = node as HTMLScriptElement;
		queueMicrotask(() =>
			(isScriptBlocked ? script.onerror : script.onload)?.call(script, new Event("x"))
		);
		return appendChild(node);
	});
});

afterEach(() => {
	clerk.instance.isSignedIn = true;
	vi.restoreAllMocks();
	document.head.innerHTML = "";
});

describe("ClerkAuth", () => {
	test("a blocked UI script resolves load() and records the error", async () => {
		isScriptBlocked = true;
		const auth = new ClerkAuth();

		await expect(auth.load(KEY)).resolves.toBeUndefined();

		expect(auth.loadError).toBe("Failed to load @clerk/ui bundle");
		expect(auth.loaded).toBe(true);
		expect(clerk.constructed).not.toHaveBeenCalled();
	});

	test("a token request waiting on a failed load resolves null", async () => {
		isScriptBlocked = true;
		const auth = new ClerkAuth();

		const token = auth.fetchAccessToken({ forceRefreshToken: false });
		await auth.load(KEY);

		await expect(token).resolves.toBeNull();
	});

	test("a token request after a failed load resolves null", async () => {
		isScriptBlocked = true;
		const auth = new ClerkAuth();
		await auth.load(KEY);

		await expect(auth.fetchAccessToken({ forceRefreshToken: false })).resolves.toBeNull();
	});

	test("a failed load after a signed-in hydrate falls back to signed out", async () => {
		isScriptBlocked = true;
		const auth = new ClerkAuth();
		auth.hydrate({ id: "user_1", email: null, name: "Alice", imageUrl: null });

		await auth.load(KEY);

		expect(auth.isSignedIn).toBe(false);
		expect(auth.profile).toBeNull();
	});

	test("a successful load leaves loadError null", async () => {
		const auth = new ClerkAuth();

		await auth.load(KEY);

		expect(auth.loadError).toBeNull();
		expect(auth.isSignedIn).toBe(true);
		await expect(auth.fetchAccessToken({ forceRefreshToken: false })).resolves.toBe("token");
	});

	test("a failed load after a signed-in hydrate keeps member navigation", async () => {
		isScriptBlocked = true;
		const auth = new ClerkAuth();
		auth.hydrate(PROFILE);

		await auth.load(KEY);

		expect(auth.isSignedIn).toBe(false);
		expect(auth.serverSignedIn).toBe(true);
		expect(auth.showsMemberNav).toBe(true);
	});

	test("a failed load after a signed-out hydrate hides member navigation", async () => {
		isScriptBlocked = true;
		const auth = new ClerkAuth();
		auth.hydrate(null);

		await auth.load(KEY);

		expect(auth.showsMemberNav).toBe(false);
	});

	test("a Clerk sign-out after a successful load hides member navigation", async () => {
		const auth = new ClerkAuth();
		auth.hydrate(PROFILE);
		await auth.load(KEY);

		clerk.instance.isSignedIn = false;
		clerk.notify();

		expect(auth.isSignedIn).toBe(false);
		expect(auth.showsMemberNav).toBe(false);
	});

	test("a second load() reuses the first", async () => {
		const auth = new ClerkAuth();

		await Promise.all([auth.load(KEY), auth.load(KEY)]);

		expect(clerk.constructed).toHaveBeenCalledTimes(1);
		expect(document.head.appendChild).toHaveBeenCalledTimes(1);
	});
});
