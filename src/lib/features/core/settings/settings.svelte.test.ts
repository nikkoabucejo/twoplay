import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { PreferencesStore } from "$lib/utils/storage";
import Settings from "./settings.svelte";

const context = vi.hoisted(() => ({ preferences: null as PreferencesStore | null }));

vi.mock("$lib/utils/storage", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/utils/storage")>()),
	getPreferences: () => context.preferences
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
