import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MoodPresence } from "$lib/features/presence";
import { PreferencesStore } from "$lib/utils/storage";
import SoundLab from "./sound-lab.svelte";

const context = vi.hoisted(() => ({
	mood: null as MoodPresence | null,
	preferences: null as PreferencesStore | null
}));

const sound = vi.hoisted(() => ({
	music: { setWanted: vi.fn() },
	playMoveSound: vi.fn(),
	playCaptureSound: vi.fn(),
	playTurnChime: vi.fn(),
	playClickSound: vi.fn()
}));

vi.mock("$lib/utils/sound", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/utils/sound")>()),
	...sound
}));

vi.mock("$lib/features/presence", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/features/presence")>()),
	getMood: () => context.mood
}));

vi.mock("$lib/utils/storage", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/utils/storage")>()),
	getPreferences: () => context.preferences
}));

const MOMENTS = ["Idle", "Your turn", "Their turn", "Searching", "Win", "Lose", "Draw"];

function moment(name: string) {
	return screen.getByRole("radio", { name: new RegExp(`^${name}`) });
}

beforeEach(() => {
	vi.clearAllMocks();
	const stored = new Map<string, string>();
	context.mood = new MoodPresence();
	context.preferences = new PreferencesStore({
		getItem: (key) => stored.get(key) ?? null,
		setItem: (key, value) => void stored.set(key, value)
	});
});

describe("SoundLab", () => {
	test("renders a radio for each moment, with Idle checked", () => {
		render(SoundLab);
		const group = screen.getByRole("radiogroup", { name: "Moment" });
		expect(within(group).getAllByRole("radio")).toHaveLength(MOMENTS.length);
		for (const name of MOMENTS) expect(moment(name)).toBeInTheDocument();
		expect(moment("Idle")).toHaveAttribute("aria-checked", "true");
	});

	test.each([
		["Your turn", { type: "turn", player: 0 }, false, null],
		["Their turn", { type: "turn", player: 1 }, false, null],
		["Searching", null, true, null],
		["Win", { type: "winner", player: 0 }, false, "win"],
		["Lose", { type: "winner", player: 1 }, false, "loss"],
		["Draw", { type: "draw" }, false, "draw"]
	])("choosing %s sets the full mood", async (name, status, searching, outcome) => {
		render(SoundLab);
		await fireEvent.click(moment(name));
		expect(context.mood?.status).toEqual(status);
		expect(context.mood?.searching).toBe(searching);
		expect(context.mood?.outcome).toBe(outcome);
		expect(moment(name)).toHaveAttribute("aria-checked", "true");
	});

	test("shows the music scene and the mood", async () => {
		render(SoundLab);
		await fireEvent.click(moment("Win"));
		expect(screen.getByText("Seat 1 wins")).toBeInTheDocument();
		expect(screen.getByText(/^Music:/).parentElement).toHaveTextContent("Music: Win");
	});

	test("arrow keys move to and choose the next moment", async () => {
		render(SoundLab);
		await fireEvent.keyDown(moment("Idle"), { key: "ArrowRight" });
		expect(context.mood?.status).toEqual({ type: "turn", player: 0 });
		expect(moment("Your turn")).toHaveFocus();
	});

	test("auto-cycle steps to the next moment every 6 seconds", async () => {
		vi.useFakeTimers();
		render(SoundLab);
		await fireEvent.click(screen.getByRole("switch", { name: "Auto-cycle" }));
		await vi.advanceTimersByTimeAsync(6000);
		expect(context.mood?.status).toEqual({ type: "turn", player: 0 });
		await vi.advanceTimersByTimeAsync(6000);
		expect(context.mood?.status).toEqual({ type: "turn", player: 1 });
		vi.useRealTimers();
	});

	test("Play starts the music without changing the saved preference", async () => {
		render(SoundLab);
		await fireEvent.click(screen.getByRole("button", { name: "Play music" }));
		expect(sound.music.setWanted).toHaveBeenLastCalledWith(true);
		expect(context.preferences?.music).toBe(false);
		await fireEvent.click(screen.getByRole("button", { name: "Stop music" }));
		expect(sound.music.setWanted).toHaveBeenLastCalledWith(false);
	});

	test.each([
		["sound is off", { sound: false, volume: 1 }],
		["volume is 0", { sound: true, volume: 0 }]
	])("Play is disabled and starts nothing while %s", async (_, saved) => {
		context.preferences?.setSound(saved.sound);
		context.preferences?.setVolume(saved.volume);
		render(SoundLab);
		const play = screen.getByRole("button", { name: "Play music" });
		expect(play).toBeDisabled();
		await fireEvent.click(play);
		expect(sound.music.setWanted).not.toHaveBeenCalledWith(true);
	});

	test("starts as Play while sound is off, even with music saved on", () => {
		context.preferences?.setMusic(true);
		context.preferences?.setSound(false);
		render(SoundLab);
		expect(screen.getByRole("button", { name: "Play music" })).toBeDisabled();
	});

	test("starts as Stop when the saved preference already plays music", () => {
		context.preferences?.setMusic(true);
		render(SoundLab);
		expect(screen.getByRole("button", { name: "Stop music" })).toBeInTheDocument();
	});

	test("unmounting resets the mood and restores the saved music preference", async () => {
		const { unmount } = render(SoundLab);
		await fireEvent.click(moment("Lose"));
		await fireEvent.click(screen.getByRole("button", { name: "Play music" }));
		unmount();
		expect(context.mood?.status).toBeNull();
		expect(context.mood?.searching).toBe(false);
		expect(context.mood?.outcome).toBeNull();
		expect(sound.music.setWanted).toHaveBeenLastCalledWith(false);
	});

	test("links to Settings while sound is off", () => {
		context.preferences?.setSound(false);
		render(SoundLab);
		const link = screen.getByRole("link", { name: "Settings" });
		expect(link).toHaveAttribute("href", "/settings");
		expect(link.closest("p")).not.toHaveClass("invisible");
	});

	test("hides the Settings note while sound is on", () => {
		render(SoundLab);
		expect(screen.getByRole("link", { name: "Settings" }).closest("p")).toHaveClass("invisible");
	});

	test("seat pads play that seat's move and capture sounds", async () => {
		render(SoundLab);
		const seat2 = screen.getByRole("group", { name: "Seat 2" });
		await fireEvent.click(within(seat2).getByRole("button", { name: "Move" }));
		expect(sound.playMoveSound).toHaveBeenCalledWith(1);
		await fireEvent.click(within(seat2).getByRole("button", { name: "Capture" }));
		expect(sound.playCaptureSound).toHaveBeenCalledWith(1);
	});

	test("the Turn chime pad plays the chime", async () => {
		render(SoundLab);
		await fireEvent.click(screen.getByRole("button", { name: "Turn chime" }));
		expect(sound.playTurnChime).toHaveBeenCalledOnce();
	});

	test("the Click pad plays the click sound", async () => {
		render(SoundLab);
		await fireEvent.click(screen.getByRole("button", { name: "Click" }));
		expect(sound.playClickSound).toHaveBeenCalledOnce();
	});

	test("the pads sit where the UI tick stays off", () => {
		render(SoundLab);
		for (const name of ["Click", "Turn chime"]) {
			expect(screen.getByRole("button", { name }).closest("[data-sfx=off]")).not.toBeNull();
		}
		const seat1 = screen.getByRole("group", { name: "Seat 1" });
		expect(seat1.closest("[data-sfx=off]")).not.toBeNull();
	});
});
