import { flushSync } from "svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	applyPreferences,
	getPreferences,
	isMusicAudible,
	isMusicWanted,
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

const DEFAULTS = {
	sound: true,
	lastPlay: null,
	volume: 1,
	turnAlert: true,
	motion: "system",
	newGameOpponent: "matchmaking",
	newGameClock: 5,
	music: false,
	uiSounds: true
};

beforeEach(() => {
	contexts.clear();
});

describe("parsePreferences", () => {
	test("nothing stored reads as the defaults", () => {
		expect(parsePreferences(null)).toEqual(DEFAULTS);
	});

	test("nothing stored gives full volume, the turn alert, system motion, and a 5 min matchmaking game", () => {
		expect(parsePreferences(null)).toMatchObject({
			volume: 1,
			turnAlert: true,
			motion: "system",
			newGameOpponent: "matchmaking",
			newGameClock: 5
		});
	});

	test("text that isn't JSON falls back to the defaults", () => {
		expect(parsePreferences("not json")).toEqual(DEFAULTS);
	});

	test("a wrong-typed sound field reads as sound on", () => {
		expect(parsePreferences('{"sound":"yes"}')).toEqual(DEFAULTS);
	});

	test("a stored sound off is kept", () => {
		expect(parsePreferences('{"sound":false}')).toEqual({ ...DEFAULTS, sound: false });
	});

	test("an out-of-range volume reads as the default and keeps sound off", () => {
		expect(parsePreferences('{"sound":false,"volume":7}')).toEqual({ ...DEFAULTS, sound: false });
		expect(parsePreferences('{"volume":-0.1}').volume).toBe(1);
		expect(parsePreferences('{"volume":"0.4"}').volume).toBe(1);
	});

	test("invalid motion, opponent, and clock fall back per field and keep the valid ones", () => {
		const lastPlay = { game: "checkers", opponent: "friend", minutes: 10 };
		const raw = JSON.stringify({
			sound: false,
			lastPlay,
			volume: 0.4,
			turnAlert: false,
			motion: "fast",
			newGameOpponent: "bot",
			newGameClock: 7
		});

		expect(parsePreferences(raw)).toEqual({
			...DEFAULTS,
			sound: false,
			lastPlay,
			volume: 0.4,
			turnAlert: false
		});
	});

	test("valid stored fields are kept", () => {
		const raw = JSON.stringify({
			volume: 0,
			turnAlert: false,
			motion: "reduce",
			newGameOpponent: "private",
			newGameClock: 10
		});

		expect(parsePreferences(raw)).toEqual({
			...DEFAULTS,
			volume: 0,
			turnAlert: false,
			motion: "reduce",
			newGameOpponent: "private",
			newGameClock: 10
		});
	});

	test("Invalid music value ignored: a non-boolean music reads as off and keeps the other fields", () => {
		const raw = JSON.stringify({ music: "yes", volume: 0.4, motion: "reduce" });

		expect(parsePreferences(raw)).toEqual({ ...DEFAULTS, volume: 0.4, motion: "reduce" });
	});

	test("a stored music on is kept", () => {
		expect(parsePreferences('{"music":true}')).toEqual({ ...DEFAULTS, music: true });
	});

	test("Invalid click sounds value ignored: a non-boolean uiSounds reads as on and keeps the other fields", () => {
		const raw = JSON.stringify({ uiSounds: "no", volume: 0.4, music: true });

		expect(parsePreferences(raw)).toEqual({ ...DEFAULTS, volume: 0.4, music: true });
	});

	test("a stored setup with an unknown game reads as absent and keeps sound", () => {
		const raw = JSON.stringify({
			sound: false,
			lastPlay: { game: "chess", opponent: "friend", minutes: 10 }
		});

		expect(parsePreferences(raw)).toEqual({ ...DEFAULTS, sound: false });
	});

	test("a stored setup with an unknown opponent reads as absent", () => {
		const raw = JSON.stringify({ lastPlay: { game: "checkers", opponent: "bot", minutes: 10 } });
		expect(parsePreferences(raw).lastPlay).toBeNull();
	});

	test("a stored setup with an unsupported clock reads as absent", () => {
		const raw = JSON.stringify({ lastPlay: { game: "checkers", opponent: "friend", minutes: 7 } });
		expect(parsePreferences(raw).lastPlay).toBeNull();
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

	test("no setup is stored by default", () => {
		expect(new PreferencesStore(memoryStorage()).lastPlay).toBeNull();
	});

	test("a stored setup reads back from a new store on the same storage", () => {
		const storage = memoryStorage();
		new PreferencesStore(storage).setLastPlay({
			game: "checkers",
			opponent: "friend",
			minutes: 10
		});

		expect(new PreferencesStore(storage).lastPlay).toEqual({
			game: "checkers",
			opponent: "friend",
			minutes: 10
		});
	});

	test("turning sound off keeps the stored setup", () => {
		const storage = memoryStorage();
		new PreferencesStore(storage).setLastPlay({
			game: "checkers",
			opponent: "friend",
			minutes: 10
		});
		new PreferencesStore(storage).setSound(false);

		const reread = new PreferencesStore(storage);
		expect(reread.sound).toBe(false);
		expect(reread.lastPlay).toEqual({ game: "checkers", opponent: "friend", minutes: 10 });
	});

	test("storing a setup keeps sound off", () => {
		const storage = memoryStorage();
		new PreferencesStore(storage).setSound(false);
		new PreferencesStore(storage).setLastPlay({
			game: "tictactoe",
			opponent: "anyone",
			minutes: 3
		});

		expect(new PreferencesStore(storage).sound).toBe(false);
	});

	test("each new setter persists its field and keeps the others", () => {
		const storage = memoryStorage();
		const lastPlay = { game: "checkers", opponent: "friend", minutes: 10 } as const;
		new PreferencesStore(storage).setSound(false);
		new PreferencesStore(storage).setLastPlay(lastPlay);
		new PreferencesStore(storage).setVolume(0.4);
		new PreferencesStore(storage).setTurnAlert(false);
		new PreferencesStore(storage).setMotion("reduce");
		new PreferencesStore(storage).setNewGameOpponent("public");
		new PreferencesStore(storage).setNewGameClock(3);

		const reread = new PreferencesStore(storage);
		expect({
			sound: reread.sound,
			lastPlay: reread.lastPlay,
			volume: reread.volume,
			turnAlert: reread.turnAlert,
			motion: reread.motion,
			newGameOpponent: reread.newGameOpponent,
			newGameClock: reread.newGameClock
		}).toEqual({
			sound: false,
			lastPlay,
			volume: 0.4,
			turnAlert: false,
			motion: "reduce",
			newGameOpponent: "public",
			newGameClock: 3
		});
	});

	test("storing a setup keeps the new fields", () => {
		const storage = memoryStorage();
		new PreferencesStore(storage).setVolume(0.4);
		new PreferencesStore(storage).setLastPlay({
			game: "tictactoe",
			opponent: "anyone",
			minutes: 3
		});

		expect(new PreferencesStore(storage).volume).toBe(0.4);
	});

	test("Music defaults off", () => {
		expect(new PreferencesStore(memoryStorage()).music).toBe(false);
	});

	test("Music choice survives reload", () => {
		const storage = memoryStorage();
		new PreferencesStore(storage).setMusic(true);

		expect(new PreferencesStore(storage).music).toBe(true);
	});

	test("Music change keeps other fields", () => {
		const storage = memoryStorage();
		const preferences = new PreferencesStore(storage);
		preferences.setVolume(0.4);
		preferences.setMotion("reduce");
		preferences.setMusic(true);

		expect(parsePreferences(storage.getItem("twoplay:prefs"))).toEqual({
			...DEFAULTS,
			volume: 0.4,
			motion: "reduce",
			music: true
		});
	});

	test("Click sounds default on", () => {
		expect(new PreferencesStore(memoryStorage()).uiSounds).toBe(true);
	});

	test("Click sounds choice survives reload", () => {
		const storage = memoryStorage();
		new PreferencesStore(storage).setUiSounds(false);

		expect(new PreferencesStore(storage).uiSounds).toBe(false);
	});

	test("Click sounds change keeps other fields", () => {
		const storage = memoryStorage();
		const preferences = new PreferencesStore(storage);
		preferences.setVolume(0.4);
		preferences.setMusic(true);
		preferences.setUiSounds(false);

		expect(parsePreferences(storage.getItem("twoplay:prefs"))).toEqual({
			...DEFAULTS,
			volume: 0.4,
			music: true,
			uiSounds: false
		});
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

describe("applyPreferences", () => {
	function applyTo(store: PreferencesStore) {
		const configureSound = vi.fn();
		const music = { setWanted: vi.fn() };
		const root = document.createElement("div");
		const destroy = $effect.root(() => {
			applyPreferences(store, { configureSound, music, root });
		});
		flushSync();
		return { configureSound, music, root, destroy };
	}

	test("pushes the sound settings on start and on change", () => {
		const store = new PreferencesStore(memoryStorage());
		const { configureSound, destroy } = applyTo(store);

		expect(configureSound).toHaveBeenLastCalledWith({ isEnabled: true, volume: 1 });

		store.setVolume(0.4);
		flushSync();
		expect(configureSound).toHaveBeenLastCalledWith({ isEnabled: true, volume: 0.4 });

		store.setSound(false);
		flushSync();
		expect(configureSound).toHaveBeenLastCalledWith({ isEnabled: false, volume: 0.4 });
		destroy();
	});

	test("sets reduce-motion for always reduce and removes it for follow the system", () => {
		const store = new PreferencesStore(memoryStorage());
		const { root, destroy } = applyTo(store);

		expect(root.classList.contains("reduce-motion")).toBe(false);

		store.setMotion("reduce");
		flushSync();
		expect(root.classList.contains("reduce-motion")).toBe(true);

		store.setMotion("system");
		flushSync();
		expect(root.classList.contains("reduce-motion")).toBe(false);
		destroy();
	});

	test("music is wanted only while music and sound are on and volume is above 0", () => {
		const store = new PreferencesStore(memoryStorage());
		const { music, destroy } = applyTo(store);
		expect(music.setWanted).toHaveBeenLastCalledWith(false);

		store.setMusic(true);
		flushSync();
		expect(music.setWanted).toHaveBeenLastCalledWith(true);

		store.setSound(false);
		flushSync();
		expect(music.setWanted).toHaveBeenLastCalledWith(false);

		store.setSound(true);
		flushSync();
		expect(music.setWanted).toHaveBeenLastCalledWith(true);

		store.setVolume(0);
		flushSync();
		expect(music.setWanted).toHaveBeenLastCalledWith(false);
		destroy();
	});

	test("a stored always reduce applies on start", () => {
		const store = new PreferencesStore(memoryStorage({ "twoplay:prefs": '{"motion":"reduce"}' }));
		const { root, destroy } = applyTo(store);

		expect(root.classList.contains("reduce-motion")).toBe(true);
		destroy();
	});
});

describe("isMusicAudible", () => {
	test.each([
		[true, 0.5, true],
		[true, 0, false],
		[false, 1, false]
	])("sound %s at volume %s is %s", (sound, volume, expected) => {
		expect(isMusicAudible({ sound, volume })).toBe(expected);
	});
});

describe("isMusicWanted", () => {
	test.each([
		[true, true, 1, true],
		[false, true, 1, false],
		[true, false, 1, false],
		[true, true, 0, false]
	])("music %s, sound %s, volume %s is %s", (music, sound, volume, expected) => {
		expect(isMusicWanted({ music, sound, volume })).toBe(expected);
	});
});

describe("setupPreferences", () => {
	test("makes the store available to getPreferences", () => {
		let preferences: PreferencesStore | undefined;
		const destroy = $effect.root(() => {
			preferences = setupPreferences();
		});
		expect(getPreferences()).toBe(preferences);
		destroy();
	});

	test("applies always reduce to the document root", () => {
		const destroy = $effect.root(() => {
			setupPreferences().setMotion("reduce");
		});
		flushSync();
		expect(document.documentElement.classList.contains("reduce-motion")).toBe(true);
		destroy();
		document.documentElement.classList.remove("reduce-motion");
		localStorage.clear();
	});
});

describe("getPreferences", () => {
	test("throws before setupPreferences", () => {
		expect(() => getPreferences()).toThrow("setupPreferences");
	});
});
