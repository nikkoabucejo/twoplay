import { afterEach, describe, expect, test, vi } from "vitest";
import { PREFERENCES_KEY } from "$lib/utils/storage";
import {
	ABOUT_BUILD_KEY,
	isReducedMotion,
	PREPAINT_SCRIPT,
	REDUCED_MOTION_QUERY,
	shouldAutoplay
} from "./prepaint.js";

type Stored = () => { getItem: (key: string) => string | null };

function memoryStorage(entries: Record<string, string> = {}) {
	return { getItem: (key: string) => entries[key] ?? null };
}

const alwaysReduce = () =>
	memoryStorage({ [PREFERENCES_KEY]: JSON.stringify({ motion: "reduce" }) });

const blocked = () => {
	throw new Error("SecurityError");
};

function media(isReduced: boolean) {
	return (query: string) => ({ matches: query === REDUCED_MOTION_QUERY && isReduced });
}

function runPrepaint({
	storage,
	local = () => memoryStorage(),
	isReduced
}: {
	storage: Stored;
	local?: Stored;
	isReduced: boolean;
}) {
	const documentElement = { dataset: {} as Record<string, string> };
	vi.stubGlobal("document", { documentElement });
	vi.stubGlobal("matchMedia", media(isReduced));
	Object.defineProperty(globalThis, "sessionStorage", { configurable: true, get: storage });
	Object.defineProperty(globalThis, "localStorage", { configurable: true, get: local });
	const body = PREPAINT_SCRIPT.replace(/^<script>/, "").replace(/<\/script>$/, "");
	new Function(body)();
	return documentElement.dataset.aboutBuild;
}

afterEach(() => {
	vi.unstubAllGlobals();
	Reflect.deleteProperty(globalThis, "sessionStorage");
	Reflect.deleteProperty(globalThis, "localStorage");
});

describe("isReducedMotion", () => {
	test("follows the OS setting", () => {
		expect(isReducedMotion(() => memoryStorage(), media(true))).toBe(true);
		expect(isReducedMotion(() => memoryStorage(), media(false))).toBe(false);
	});

	test("honors the app's Always reduce setting on a full-motion system", () => {
		expect(isReducedMotion(alwaysReduce, media(false))).toBe(true);
	});

	test("reads blocked or unreadable preferences as the OS setting", () => {
		expect(isReducedMotion(blocked, media(false))).toBe(false);
		expect(isReducedMotion(() => memoryStorage({ [PREFERENCES_KEY]: "{" }), media(false))).toBe(
			false
		);
	});
});

describe("shouldAutoplay", () => {
	test("plays on a first visit with motion allowed", () => {
		expect(
			shouldAutoplay(
				() => memoryStorage(),
				() => memoryStorage(),
				media(false)
			)
		).toBe(true);
	});

	test("does not play once the session flag is set", () => {
		const session = () => memoryStorage({ [ABOUT_BUILD_KEY]: "1" });
		expect(shouldAutoplay(session, () => memoryStorage(), media(false))).toBe(false);
	});

	test("does not play under reduced motion", () => {
		expect(
			shouldAutoplay(
				() => memoryStorage(),
				() => memoryStorage(),
				media(true)
			)
		).toBe(false);
	});

	test("does not play under the app's Always reduce setting", () => {
		expect(shouldAutoplay(() => memoryStorage(), alwaysReduce, media(false))).toBe(false);
	});

	test("plays when storage throws", () => {
		expect(shouldAutoplay(blocked, blocked, media(false))).toBe(true);
	});
});

describe("PREPAINT_SCRIPT", () => {
	test("is one inline script element", () => {
		expect(PREPAINT_SCRIPT).toMatch(/^<script>.+<\/script>$/s);
	});

	test("marks the page pending on a first visit with motion allowed", () => {
		expect(runPrepaint({ storage: () => memoryStorage(), isReduced: false })).toBe("pending");
	});

	test("leaves the page alone once the session flag is set", () => {
		const storage = () => memoryStorage({ [ABOUT_BUILD_KEY]: "1" });
		expect(runPrepaint({ storage, isReduced: false })).toBeUndefined();
	});

	test("leaves the page alone under reduced motion", () => {
		expect(runPrepaint({ storage: () => memoryStorage(), isReduced: true })).toBeUndefined();
	});

	test("leaves the page alone under the app's Always reduce setting", () => {
		expect(
			runPrepaint({ storage: () => memoryStorage(), local: alwaysReduce, isReduced: false })
		).toBeUndefined();
	});

	test("does not throw when storage throws, and marks the page pending", () => {
		expect(runPrepaint({ storage: blocked, local: blocked, isReduced: false })).toBe("pending");
	});
});
