import { getContext, setContext } from "svelte";
import { browser } from "$app/environment";

export type Preferences = { sound: boolean };
type PreferencesStorage = Pick<Storage, "getItem" | "setItem">;

const STORAGE_KEY = "twoplay:prefs";
const DEFAULT_PREFERENCES: Preferences = { sound: true };
const CONTEXT_KEY = Symbol("preferences");

/** Keeps each valid stored field and falls back to its default otherwise, so it never throws. */
export function parsePreferences(raw: string | null): Preferences {
	let stored: unknown;
	try {
		stored = JSON.parse(raw ?? "null");
	} catch {
		stored = null;
	}
	const sound =
		typeof stored === "object" && stored !== null && "sound" in stored ? stored.sound : null;
	return { sound: typeof sound === "boolean" ? sound : DEFAULT_PREFERENCES.sound };
}

export class PreferencesStore {
	sound = $state(DEFAULT_PREFERENCES.sound);

	#storage: PreferencesStorage | null;

	constructor(storage: PreferencesStorage | null) {
		this.#storage = storage;
		let raw: string | null = null;
		try {
			raw = storage?.getItem(STORAGE_KEY) ?? null;
		} catch {
			// Storage access throws in some privacy modes; the defaults apply.
		}
		this.sound = parsePreferences(raw).sound;
	}

	setSound(value: boolean): void {
		this.sound = value;
		try {
			this.#storage?.setItem(STORAGE_KEY, JSON.stringify({ sound: this.sound }));
		} catch {
			// Unwritable storage keeps the choice for this page load only.
		}
	}
}

export function setupPreferences(): PreferencesStore {
	let storage: PreferencesStorage | null = null;
	try {
		if (browser) storage = localStorage;
	} catch {
		// Reading `localStorage` itself throws when the browser blocks site data.
	}
	const preferences = new PreferencesStore(storage);
	setContext(CONTEXT_KEY, preferences);
	return preferences;
}

export function getPreferences(): PreferencesStore {
	const preferences = getContext<PreferencesStore | undefined>(CONTEXT_KEY);
	if (!preferences) throw new Error("getPreferences() was called before setupPreferences()");
	return preferences;
}
