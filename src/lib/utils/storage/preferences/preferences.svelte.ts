import { getContext, setContext } from "svelte";
import { browser } from "$app/environment";
import { configureSound, music, type MusicPlayer } from "$lib/utils/sound";
import type { GameType } from "../../../../../convex/models/games/index.js";

export type PlayOpponent = "anyone" | "friend" | "open";
export type PlayMinutes = 3 | 5 | 10;
export type LastPlay = { game: GameType; opponent: PlayOpponent; minutes: PlayMinutes };
export type Motion = "system" | "reduce";
export type NewGameOpponent = "matchmaking" | "public" | "private";
export type NewGameClock = 3 | 5 | 10;
export type Preferences = {
	sound: boolean;
	lastPlay: LastPlay | null;
	volume: number;
	turnAlert: boolean;
	motion: Motion;
	newGameOpponent: NewGameOpponent;
	newGameClock: NewGameClock;
	music: boolean;
};
type PreferencesStorage = Pick<Storage, "getItem" | "setItem">;

const STORAGE_KEY = "twoplay:prefs";
const DEFAULT_PREFERENCES: Preferences = {
	sound: true,
	lastPlay: null,
	volume: 1,
	turnAlert: true,
	motion: "system",
	newGameOpponent: "matchmaking",
	newGameClock: 5,
	music: false
};
const CONTEXT_KEY = Symbol("preferences");

// A record rather than an array so adding a game to `GameType` fails the type check here.
const STORED_GAMES = { tictactoe: true, checkers: true } satisfies Record<GameType, true>;
const PLAY_OPPONENTS: readonly unknown[] = ["anyone", "friend", "open"] satisfies PlayOpponent[];
const PLAY_MINUTES: readonly unknown[] = [3, 5, 10] satisfies PlayMinutes[];

export const MOTION_OPTIONS = ["system", "reduce"] as const satisfies readonly Motion[];
export const NEW_GAME_OPPONENTS = [
	"matchmaking",
	"public",
	"private"
] as const satisfies readonly NewGameOpponent[];
export const NEW_GAME_CLOCKS = [3, 5, 10] as const satisfies readonly NewGameClock[];

function oneOf<T>(options: readonly T[], value: unknown, fallback: T): T {
	return options.includes(value as T) ? (value as T) : fallback;
}

function parseVolume(value: unknown): number {
	return typeof value === "number" && value >= 0 && value <= 1 ? value : DEFAULT_PREFERENCES.volume;
}

function parseLastPlay(value: unknown): LastPlay | null {
	if (typeof value !== "object" || value === null) return null;
	const { game, opponent, minutes } = value as Record<string, unknown>;
	if (typeof game !== "string" || !Object.hasOwn(STORED_GAMES, game)) return null;
	if (!PLAY_OPPONENTS.includes(opponent) || !PLAY_MINUTES.includes(minutes)) return null;
	return {
		game: game as GameType,
		opponent: opponent as PlayOpponent,
		minutes: minutes as PlayMinutes
	};
}

/** Keeps each valid stored field and falls back to its default otherwise, so it never throws. */
export function parsePreferences(raw: string | null): Preferences {
	let stored: unknown;
	try {
		stored = JSON.parse(raw ?? "null");
	} catch {
		stored = null;
	}
	const fields: Record<string, unknown> =
		typeof stored === "object" && stored !== null ? (stored as Record<string, unknown>) : {};
	return {
		sound: typeof fields.sound === "boolean" ? fields.sound : DEFAULT_PREFERENCES.sound,
		lastPlay: parseLastPlay(fields.lastPlay),
		volume: parseVolume(fields.volume),
		turnAlert:
			typeof fields.turnAlert === "boolean" ? fields.turnAlert : DEFAULT_PREFERENCES.turnAlert,
		motion: oneOf(MOTION_OPTIONS, fields.motion, DEFAULT_PREFERENCES.motion),
		newGameOpponent: oneOf(
			NEW_GAME_OPPONENTS,
			fields.newGameOpponent,
			DEFAULT_PREFERENCES.newGameOpponent
		),
		newGameClock: oneOf(NEW_GAME_CLOCKS, fields.newGameClock, DEFAULT_PREFERENCES.newGameClock),
		music: typeof fields.music === "boolean" ? fields.music : DEFAULT_PREFERENCES.music
	};
}

export class PreferencesStore {
	sound = $state(DEFAULT_PREFERENCES.sound);
	lastPlay = $state<LastPlay | null>(DEFAULT_PREFERENCES.lastPlay);
	volume = $state(DEFAULT_PREFERENCES.volume);
	turnAlert = $state(DEFAULT_PREFERENCES.turnAlert);
	motion = $state<Motion>(DEFAULT_PREFERENCES.motion);
	newGameOpponent = $state<NewGameOpponent>(DEFAULT_PREFERENCES.newGameOpponent);
	newGameClock = $state<NewGameClock>(DEFAULT_PREFERENCES.newGameClock);
	music = $state(DEFAULT_PREFERENCES.music);

	#storage: PreferencesStorage | null;

	constructor(storage: PreferencesStorage | null) {
		this.#storage = storage;
		let raw: string | null = null;
		try {
			raw = storage?.getItem(STORAGE_KEY) ?? null;
		} catch {
			// Storage access throws in some privacy modes; the defaults apply.
		}
		const preferences = parsePreferences(raw);
		this.sound = preferences.sound;
		this.lastPlay = preferences.lastPlay;
		this.volume = preferences.volume;
		this.turnAlert = preferences.turnAlert;
		this.motion = preferences.motion;
		this.newGameOpponent = preferences.newGameOpponent;
		this.newGameClock = preferences.newGameClock;
		this.music = preferences.music;
	}

	setSound(value: boolean): void {
		this.sound = value;
		this.#write();
	}

	setLastPlay(value: LastPlay): void {
		this.lastPlay = value;
		this.#write();
	}

	setVolume(value: number): void {
		this.volume = value;
		this.#write();
	}

	setTurnAlert(value: boolean): void {
		this.turnAlert = value;
		this.#write();
	}

	setMotion(value: Motion): void {
		this.motion = value;
		this.#write();
	}

	setNewGameOpponent(value: NewGameOpponent): void {
		this.newGameOpponent = value;
		this.#write();
	}

	setNewGameClock(value: NewGameClock): void {
		this.newGameClock = value;
		this.#write();
	}

	setMusic(value: boolean): void {
		this.music = value;
		this.#write();
	}

	/** Writes every field, so changing one preference never drops another. */
	#write(): void {
		const preferences: Preferences = {
			sound: this.sound,
			lastPlay: this.lastPlay,
			volume: this.volume,
			turnAlert: this.turnAlert,
			motion: this.motion,
			newGameOpponent: this.newGameOpponent,
			newGameClock: this.newGameClock,
			music: this.music
		};
		try {
			this.#storage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
		} catch {
			// Unwritable storage keeps the choice for this page load only.
		}
	}
}

type ApplyDeps = {
	configureSound: typeof configureSound;
	music: Pick<MusicPlayer, "setWanted">;
	root: Pick<Element, "classList">;
};

/** Keeps the sound output, the music, and the root `reduce-motion` class in step with the store. */
export function applyPreferences(
	preferences: Pick<Preferences, "sound" | "volume" | "motion" | "music">,
	deps: ApplyDeps
): void {
	$effect(() => {
		deps.configureSound({ isEnabled: preferences.sound, volume: preferences.volume });
	});
	$effect(() => {
		deps.music.setWanted(preferences.music && preferences.sound && preferences.volume > 0);
	});
	$effect(() => {
		deps.root.classList.toggle("reduce-motion", preferences.motion === "reduce");
	});
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
	if (browser) {
		applyPreferences(preferences, { configureSound, music, root: document.documentElement });
	}
	return preferences;
}

export function getPreferences(): PreferencesStore {
	const preferences = getContext<PreferencesStore | undefined>(CONTEXT_KEY);
	if (!preferences) throw new Error("getPreferences() was called before setupPreferences()");
	return preferences;
}
