import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { playClickSound } from "$lib/utils/sound";
import { PreferencesStore } from "$lib/utils/storage";
import Settings from "./settings.svelte";

const context = vi.hoisted(() => ({ preferences: null as PreferencesStore | null }));

vi.mock("$lib/utils/storage", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/utils/storage")>()),
	getPreferences: () => context.preferences
}));

vi.mock("$lib/utils/sound", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/utils/sound")>()),
	playClickSound: vi.fn()
}));

let stored: Map<string, string>;

// The slider measures its track; jsdom has no ResizeObserver.
beforeAll(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
});

function storage() {
	return {
		getItem: (key: string) => stored.get(key) ?? null,
		setItem: (key: string, value: string) => void stored.set(key, value)
	};
}

beforeEach(() => {
	stored = new Map();
	context.preferences = new PreferencesStore(storage());
	render(Settings);
});

function reload() {
	return new PreferencesStore(storage());
}

describe("Settings", () => {
	test("the Sound switch turns sound off and disables the volume slider", async () => {
		const sound = screen.getByRole("switch", { name: "Sound" });
		expect(sound).toBeChecked();
		await fireEvent.click(sound);
		expect(sound).not.toBeChecked();
		expect(reload().sound).toBe(false);
		expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-disabled", "true");
	});

	test("the volume slider shows the volume and saves a change", async () => {
		const volume = screen.getByRole("slider", { name: "Volume" });
		expect(volume).toHaveAttribute("aria-valuenow", "100");
		expect(screen.getByText("100%")).toBeInTheDocument();
		await fireEvent.keyDown(volume, { key: "ArrowLeft" });
		expect(screen.getByText("95%")).toBeInTheDocument();
		expect(reload().volume).toBe(0.95);
	});

	test("the Background music switch turns music on and saves it", async () => {
		const music = screen.getByRole("switch", { name: "Background music" });
		expect(music).not.toBeChecked();
		await fireEvent.click(music);
		expect(music).toBeChecked();
		expect(reload().music).toBe(true);
	});

	test("the Background music switch is disabled while Sound is off", async () => {
		const music = screen.getByRole("switch", { name: "Background music" });
		expect(music).toBeEnabled();
		await fireEvent.click(screen.getByRole("switch", { name: "Sound" }));
		expect(music).toBeDisabled();
	});

	test("the Click sounds switch turns click sounds off and saves it", async () => {
		const clicks = screen.getByRole("switch", { name: "Click sounds" });
		expect(clicks).toBeChecked();
		await fireEvent.click(clicks);
		expect(clicks).not.toBeChecked();
		expect(reload().uiSounds).toBe(false);
	});

	test("turning Click sounds on plays a tick, and turning it off does not", async () => {
		const clicks = screen.getByRole("switch", { name: "Click sounds" });
		vi.mocked(playClickSound).mockClear();

		await fireEvent.click(clicks);
		expect(playClickSound).not.toHaveBeenCalled();

		await fireEvent.click(clicks);
		expect(playClickSound).toHaveBeenCalledTimes(1);
	});

	test("the Click sounds switch is disabled while Sound is off", async () => {
		const clicks = screen.getByRole("switch", { name: "Click sounds" });
		expect(clicks).toBeEnabled();
		await fireEvent.click(screen.getByRole("switch", { name: "Sound" }));
		expect(clicks).toBeDisabled();
	});

	test("the Sound, Background music, and Click sounds rows describe what they control", () => {
		expect(screen.getByText("Game sounds and music.")).toBeInTheDocument();
		expect(screen.getByText("A quiet retro loop.")).toBeInTheDocument();
		expect(screen.getByText("A soft tick when you press a button.")).toBeInTheDocument();
	});

	test("the Your-turn alert switch saves its value", async () => {
		await fireEvent.click(screen.getByRole("switch", { name: "Your-turn alert" }));
		expect(reload().turnAlert).toBe(false);
	});

	test("Always reduce saves the motion choice", async () => {
		const motion = screen.getByRole("radiogroup", { name: "Reduce motion" });
		expect(motion).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("radio", { name: "Always reduce" }));
		expect(screen.getByRole("radio", { name: "Always reduce" })).toBeChecked();
		expect(reload().motion).toBe("reduce");
	});

	test("the new-game opponent and clock save their choices", async () => {
		expect(screen.getByRole("radiogroup", { name: "Opponent" })).toBeInTheDocument();
		expect(screen.getByRole("radiogroup", { name: "Clock" })).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("radio", { name: "Private" }));
		await fireEvent.click(screen.getByRole("radio", { name: "10 min" }));
		const preferences = reload();
		expect(preferences.newGameOpponent).toBe("private");
		expect(preferences.newGameClock).toBe(10);
	});

	test("has no save button", () => {
		expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
	});
});
