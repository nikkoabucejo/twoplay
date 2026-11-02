import { render, screen, within } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { MoodPresence } from "$lib/features/presence";
import { PreferencesStore } from "$lib/utils/storage";
import Sandbox from "./sandbox.svelte";

const context = vi.hoisted(() => ({
	mood: null as MoodPresence | null,
	preferences: null as PreferencesStore | null
}));

vi.mock("$lib/utils/sound", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/utils/sound")>()),
	music: { setWanted: vi.fn() }
}));

vi.mock("$lib/features/presence", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/features/presence")>()),
	getMood: () => context.mood
}));

vi.mock("$lib/utils/storage", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/utils/storage")>()),
	getPreferences: () => context.preferences
}));

// Keeps lottie-web inert, as in playing.svelte.test.ts: it paints a 1x1 canvas on load, then fetches JSON.
// Emoji imports it lazily, so load it here while the stub is in place rather than after the last test.
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
	const stored = new Map<string, string>();
	context.mood = new MoodPresence();
	context.preferences = new PreferencesStore({
		getItem: (key) => stored.get(key) ?? null,
		setItem: (key, value) => void stored.set(key, value)
	});
});

describe("Sandbox", () => {
	test("the Sound section holds the sound and mood lab", () => {
		render(Sandbox);
		const section = screen.getByRole("region", { name: "Sound" });
		expect(within(section).getByRole("radiogroup", { name: "Moment" })).toBeInTheDocument();
	});

	test("shows the Sound and Game sections in order", () => {
		render(Sandbox);
		const sound = screen.getByRole("heading", { level: 2, name: "Sound" });
		const game = screen.getByRole("heading", { level: 2, name: "Game" });
		expect(sound.compareDocumentPosition(game)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});
});
