import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	getPreferences,
	parsePreferences,
	PreferencesStore,
	setupPreferences
} from "./preferences.svelte.js";

const contexts = vi.hoisted(() => new Map<unknown, unknown>());

vi.mock("svelte", async (importOriginal) => ({
	...(await importOriginal<typeof import("svelte")>()),
	getContext: (key: unknown) => contexts.get(key),
	setContext: (key: unknown, value: unknown) => {
		contexts.set(key, value);
		return value;
	}
}));

function memoryStorage(initial: Record<string, string> = {}) {
	const items = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => void items.set(key, value)
	};
}

const brokenStorage = {
	getItem(): string | null {
		throw new Error("SecurityError");
	},
	setItem() {
		throw new Error("QuotaExceededError");
	}
};

beforeEach(() => {
	contexts.clear();
});

describe("parsePreferences", () => {
	test("nothing stored means sound is on", () => {
		expect(parsePreferences(null)).toEqual({ sound: true });
	});

	test("text that isn't JSON falls back to the defaults", () => {
		expect(parsePreferences("not json")).toEqual({ sound: true });
	});

	test("a wrong-typed sound field reads as sound on", () => {
		expect(parsePreferences('{"sound":"yes"}')).toEqual({ sound: true });
	});

	test("a stored sound off is kept", () => {
		expect(parsePreferences('{"sound":false}')).toEqual({ sound: false });
	});
});

describe("PreferencesStore", () => {
	test("sound is on when nothing is stored", () => {
		expect(new PreferencesStore(memoryStorage()).sound).toBe(true);
	});

	test("sound turned off reads off from a new store on the same storage", () => {
		const storage = memoryStorage();
		new PreferencesStore(storage).setSound(false);

		expect(new PreferencesStore(storage).sound).toBe(false);
	});

	test("corrupt stored JSON reads as the defaults", () => {
		const storage = memoryStorage({ "twoplay:prefs": "not json" });
		expect(new PreferencesStore(storage).sound).toBe(true);
	});

	test("storage that throws reads the defaults", () => {
		expect(new PreferencesStore(brokenStorage).sound).toBe(true);
	});

	test("a write to storage that throws still updates the value", () => {
		const preferences = new PreferencesStore(brokenStorage);

		expect(() => preferences.setSound(false)).not.toThrow();
		expect(preferences.sound).toBe(false);
	});

	test("no storage reads the defaults and ignores writes", () => {
		const preferences = new PreferencesStore(null);
		preferences.setSound(false);

		expect(preferences.sound).toBe(false);
		expect(new PreferencesStore(null).sound).toBe(true);
	});
});

describe("setupPreferences", () => {
	test("makes the store available to getPreferences", () => {
		const preferences = setupPreferences();
		expect(getPreferences()).toBe(preferences);
	});
});

describe("getPreferences", () => {
	test("throws before setupPreferences", () => {
		expect(() => getPreferences()).toThrow("setupPreferences");
	});
});
