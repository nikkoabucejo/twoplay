import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { SoundGraph } from "./graph.js";
import { bindMusicLifecycle, MusicPlayer, notesForStep, type Note } from "./music.js";

const STEPS_PER_BAR = 16;
const STEP_SECONDS = 60 / 76 / 4;
const BAR_SECONDS = STEPS_PER_BAR * STEP_SECONDS;
const CHORDS = {
	Fmaj7: ["F", "A", "C", "E"],
	Em7: ["E", "G", "B", "D"],
	Dm7: ["D", "F", "A", "C"],
	Cmaj7: ["C", "E", "G", "B"]
};
const ROOTS = ["F", "E", "D", "C"];
const C_MAJOR = ["C", "D", "E", "F", "G", "A", "B"];
const PITCH_CLASSES = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];

function pitchClass(frequency: number): string {
	const semitones = Math.round(12 * Math.log2(frequency / 440));
	return PITCH_CLASSES[((semitones % 12) + 12) % 12];
}

function barNotes(bar: number): Note[][] {
	return Array.from({ length: STEPS_PER_BAR }, (_, step) =>
		notesForStep(bar * STEPS_PER_BAR + step)
	);
}

function padChord(bar: number): string[] {
	return notesForStep(bar * STEPS_PER_BAR)
		.filter((note) => note.voice === "pad")
		.map((note) => pitchClass(note.frequency));
}

/** The steps a voice's notes in this bar run to, counted from the bar's first step. */
function noteEnds(bar: number, voice: Note["voice"]): number[] {
	return barNotes(bar).flatMap((notes, step) =>
		notes
			.filter((note) => note.voice === voice)
			.map((note) => step + Math.round(note.duration / STEP_SECONDS))
	);
}

describe("notesForStep", () => {
	test("Chord loop: bars 0-7 are Fmaj7, Em7, Dm7, Cmaj7 twice, and bar 8 repeats bar 0", () => {
		const chords = Object.values(CHORDS);
		expect([0, 1, 2, 3, 4, 5, 6, 7].map(padChord)).toEqual([...chords, ...chords]);
		expect(barNotes(8)).toEqual(barNotes(0));
	});

	test("bars 4-7 carry a different melody from bars 0-3", () => {
		for (const bar of [0, 1, 2, 3]) expect(barNotes(bar + 4)).not.toEqual(barNotes(bar));
	});

	test("Bass on the root: step 0 of every bar has a bass note at that bar's root", () => {
		for (let bar = 0; bar < 8; bar++) {
			const bass = notesForStep(bar * STEPS_PER_BAR).filter((note) => note.voice === "bass");
			expect(bass.map((note) => pitchClass(note.frequency))).toEqual([ROOTS[bar % 4]]);
		}
	});

	test("Sparse melody: fewer than 8 of 16 steps carry a lead note, in C major, passing tones short", () => {
		for (let bar = 0; bar < 8; bar++) {
			const chord = Object.values(CHORDS)[bar % 4];
			const leads = barNotes(bar).map((notes) => notes.filter((note) => note.voice === "lead"));
			const leadSteps = leads.filter((notes) => notes.length > 0);
			expect(leadSteps.length).toBeGreaterThan(0);
			expect(leadSteps.length).toBeLessThan(8);
			for (const note of leads.flat()) {
				expect(C_MAJOR).toContain(pitchClass(note.frequency));
				if (!chord.includes(pitchClass(note.frequency))) {
					expect(note.duration).toBeLessThanOrEqual(2 * STEP_SECONDS + 1e-9);
				}
			}
		}
	});

	test("bars 4-7 have melody entries on odd steps, so the swing moves them", () => {
		const oddEntries = [4, 5, 6, 7].flatMap((bar) =>
			barNotes(bar).filter((notes, step) => step % 2 === 1 && notes.some((n) => n.voice === "lead"))
		);
		expect(oddEntries.length).toBeGreaterThan(0);
	});

	test("Loop seam: the last bar's lead and bass run up to the loop's restart", () => {
		expect(Math.max(...noteEnds(7, "lead"))).toBeGreaterThanOrEqual(STEPS_PER_BAR);
		expect(Math.max(...noteEnds(7, "bass"))).toBeGreaterThanOrEqual(STEPS_PER_BAR);
	});

	test("every note has a positive frequency and duration", () => {
		for (let bar = 0; bar < 8; bar++) {
			for (const note of barNotes(bar).flat()) {
				expect(note.frequency).toBeGreaterThan(0);
				expect(note.duration).toBeGreaterThan(0);
			}
		}
	});
});

type Automation =
	| { kind: "set" | "ramp"; value: number; time: number }
	| { kind: "target"; value: number; time: number; timeConstant: number };

/** The value of an envelope built from set, linear ramp, and target events, at `time`. */
function valueAt(events: Automation[], time: number): number {
	let from = { value: 0, time: 0 };
	let target: { value: number; timeConstant: number } | null = null;
	const current = (at: number) =>
		target
			? target.value +
				(from.value - target.value) * Math.exp(-(at - from.time) / target.timeConstant)
			: from.value;
	for (const event of events) {
		if (event.time > time) {
			if (event.kind !== "ramp") break;
			const start = current(from.time);
			return start + ((event.value - start) * (time - from.time)) / (event.time - from.time);
		}
		const value = event.kind === "target" ? current(event.time) : event.value;
		target = event.kind === "target" ? event : null;
		from = { value, time: event.time };
	}
	return current(time);
}

class FakeParam {
	value = 0;
	events: Automation[] = [];
	setValueAtTime(value: number, time: number) {
		this.events.push({ kind: "set", value, time });
	}
	linearRampToValueAtTime(value: number, time: number) {
		this.events.push({ kind: "ramp", value, time });
	}
	setTargetAtTime(value: number, time: number, timeConstant: number) {
		this.events.push({ kind: "target", value, time, timeConstant });
	}
	cancelScheduledValues() {}
	lastRamp() {
		return this.events.findLast((event) => event.kind === "ramp");
	}
}

class FakeNode {
	frequency = new FakeParam();
	gain = new FakeParam();
	Q = new FakeParam();
	type = "";
	outputs: FakeNode[] = [];
	startTime = Infinity;
	stopTime = Infinity;
	connect(node: FakeNode) {
		this.outputs.push(node);
		return node;
	}
	start(time: number) {
		this.startTime = time;
	}
	stop(time: number) {
		this.stopTime = time;
	}
}

class FakeContext {
	currentTime = 0;
	state: AudioContextState = "running";
	resume = vi.fn(async () => {
		this.state = "running";
	});
	oscillators: FakeNode[] = [];
	gains: FakeNode[] = [];
	filters: FakeNode[] = [];
	createOscillator() {
		const node = new FakeNode();
		this.oscillators.push(node);
		return node;
	}
	createGain() {
		const node = new FakeNode();
		this.gains.push(node);
		return node;
	}
	createBiquadFilter() {
		const node = new FakeNode();
		this.filters.push(node);
		return node;
	}
}

function reaches(from: FakeNode, target: FakeNode): boolean {
	return from === target || from.outputs.some((node) => reaches(node, target));
}

function setupPlayer() {
	const ctx = new FakeContext();
	const master = new FakeNode();
	const graph = { ctx, master } as unknown as SoundGraph; // the fakes cover only the nodes music uses
	const getGraph = vi.fn(() => graph);
	const player = new MusicPlayer({
		getGraph,
		setTimer: (callback, ms) => setTimeout(callback, ms),
		clearTimer: (id) => clearTimeout(id)
	});
	function advance(seconds: number) {
		for (let elapsed = 0; elapsed < seconds; elapsed += 0.025) {
			ctx.currentTime += 0.025;
			vi.advanceTimersByTime(25);
		}
	}
	function musicGain() {
		const [gain] = ctx.gains.filter((node) => node.outputs.includes(master));
		return gain;
	}
	return { ctx, master, getGraph, player, advance, musicGain };
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("MusicPlayer", () => {
	test("Muted page creates no audio context", () => {
		const { getGraph, player, advance } = setupPlayer();

		player.setWanted(false);
		player.unlock();
		player.setHidden(false);
		advance(1);

		expect(getGraph).not.toHaveBeenCalled();
	});

	test("No gesture, no music", () => {
		const { getGraph, player, advance } = setupPlayer();

		player.setWanted(true);
		advance(1);

		expect(getGraph).not.toHaveBeenCalled();
	});

	test("First gesture starts music", () => {
		const { ctx, player } = setupPlayer();

		player.setWanted(true);
		player.unlock();

		expect(ctx.oscillators.length).toBeGreaterThan(0);
	});

	test("Turning music on starts it", () => {
		const { ctx, player } = setupPlayer();

		player.unlock();
		player.setWanted(true);

		expect(ctx.oscillators.length).toBeGreaterThan(0);
	});

	test("Fade in: the music gain ramps from 0 to 0.2 over about 1.5s", () => {
		const { player, musicGain } = setupPlayer();

		player.unlock();
		player.setWanted(true);

		const gain = musicGain().gain;
		expect(gain.events[0]).toMatchObject({ kind: "set", value: 0 });
		expect(gain.lastRamp()).toEqual({ kind: "ramp", value: 0.2, time: 1.5 });
	});

	test("Fade out: the music gain ramps to 0 over about 1.5s while notes still play", () => {
		const { ctx, player, advance, musicGain } = setupPlayer();
		player.unlock();
		player.setWanted(true);
		advance(1);

		player.setWanted(false);
		const fadeStart = ctx.currentTime;
		const before = ctx.oscillators.length;
		advance(1);

		expect(musicGain().gain.lastRamp()).toEqual({ kind: "ramp", value: 0, time: fadeStart + 1.5 });
		expect(ctx.oscillators.length).toBeGreaterThan(before);
	});

	test("Sound off silences music: no notes are scheduled after the fade", () => {
		const { ctx, player, advance } = setupPlayer();
		player.unlock();
		player.setWanted(true);
		advance(1);

		player.setWanted(false);
		advance(2);
		const after = ctx.oscillators.length;
		advance(5);

		expect(ctx.oscillators.length).toBe(after);
	});

	test("Tab hidden: no new notes are scheduled once the fade ends", () => {
		const { ctx, player, advance, musicGain } = setupPlayer();
		player.unlock();
		player.setWanted(true);
		advance(1);

		player.setHidden(true);
		advance(2);
		const after = ctx.oscillators.length;
		advance(5);

		expect(musicGain().gain.lastRamp()?.value).toBe(0);
		expect(ctx.oscillators.length).toBe(after);
	});

	test("Tab visible again: music resumes and fades back in", () => {
		const { ctx, player, advance, musicGain } = setupPlayer();
		player.unlock();
		player.setWanted(true);
		player.setHidden(true);
		advance(3);
		const paused = ctx.oscillators.length;

		player.setHidden(false);
		advance(1);

		expect(ctx.oscillators.length).toBeGreaterThan(paused);
		expect(musicGain().gain.lastRamp()?.value).toBe(0.2);
	});

	test("visible again with music off stays silent", () => {
		const { ctx, player, advance } = setupPlayer();
		player.unlock();
		player.setHidden(true);
		player.setHidden(false);
		advance(1);

		expect(ctx.oscillators).toHaveLength(0);
	});

	test("pausing keeps the loop position instead of restarting from the first bar", () => {
		const { ctx, player, advance } = setupPlayer();
		player.unlock();
		player.setWanted(true);
		advance(4);
		player.setHidden(true);
		advance(3);
		player.setHidden(false);
		advance(4);

		const bassRoots = ctx.oscillators
			.map((node) => node.frequency.events[0].value)
			.filter((frequency) => frequency < 110)
			.filter((frequency, index, all) => frequency !== all[index - 1]);
		expect(bassRoots.slice(0, 3)).toEqual([87.305, 82.405, 73.415]);
	});

	test("Music routing: every voice goes through a lowpass and the music gain into master", () => {
		const { ctx, master, player, musicGain } = setupPlayer();
		player.unlock();
		player.setWanted(true);

		const gain = musicGain();
		expect(gain.gain.lastRamp()?.value).toBe(0.2);
		const [filter] = ctx.filters;
		expect(filter.type).toBe("lowpass");
		expect(filter.outputs).toContain(gain);
		for (const oscillator of ctx.oscillators) expect(reaches(oscillator, filter)).toBe(true);
		expect(reaches(gain, master)).toBe(true);
	});

	test("Pad crossfade: each chord holds full level to its bar's end and hands over within 0.15s", () => {
		const { ctx, player, advance } = setupPlayer();
		player.unlock();
		player.setWanted(true);
		advance(9 * BAR_SECONDS);

		const pads = ctx.oscillators.filter(
			(node) => node.type === "triangle" && node.stopTime - node.startTime >= BAR_SECONDS
		);
		const envelopes = pads.map((node) => ({
			start: node.startTime,
			events: node.outputs[0].gain.events
		}));
		const peak = Math.max(
			...envelopes.map(({ events }) => Math.max(...events.map((e) => e.value)))
		);
		const barStarts = [...new Set(envelopes.map(({ start }) => start))];
		expect(barStarts.length).toBeGreaterThanOrEqual(9);

		for (const { start, events } of envelopes) {
			const end = start + BAR_SECONDS;
			expect(valueAt(events, start + 0.1)).toBeGreaterThan(0.95 * peak);
			expect(valueAt(events, end - 0.005)).toBeGreaterThan(0.99 * peak);
			expect(valueAt(events, end + 0.15)).toBeLessThan(0.05 * peak);
		}

		const sounding = (time: number) =>
			envelopes.reduce((sum, { events }) => sum + valueAt(events, time), 0);
		const full = sounding(barStarts[0] + BAR_SECONDS / 2);
		for (let time = barStarts[0] + 0.1; time < barStarts[barStarts.length - 1]; time += 0.005) {
			expect(sounding(time)).toBeGreaterThan(0.85 * full);
		}
	});

	test("starting resumes an interrupted context", () => {
		const { ctx, player } = setupPlayer();
		ctx.state = "interrupted";
		player.setWanted(true);
		player.unlock();

		expect(ctx.resume).toHaveBeenCalledTimes(1);
	});

	test("starting resumes a suspended context, on every unlock", () => {
		const { ctx, player } = setupPlayer();
		ctx.state = "suspended";
		player.setWanted(true);
		player.unlock();
		expect(ctx.resume).toHaveBeenCalledTimes(1);

		ctx.state = "suspended";
		player.unlock();

		expect(ctx.resume).toHaveBeenCalledTimes(2);
	});

	test("repeat unlocks keep one graph and do not reschedule notes", () => {
		const { ctx, getGraph, player } = setupPlayer();
		player.setWanted(true);
		player.unlock();
		const scheduled = ctx.oscillators.length;

		player.unlock();
		player.unlock();

		expect(getGraph).toHaveBeenCalledTimes(1);
		expect(ctx.oscillators).toHaveLength(scheduled);
	});

	test("a late tick skips overdue steps instead of scheduling them in the past", () => {
		const { ctx, player, advance } = setupPlayer();
		player.unlock();
		player.setWanted(true);
		advance(1);
		const before = ctx.oscillators.length;

		ctx.currentTime += 2;
		const lateTime = ctx.currentTime;
		vi.advanceTimersByTime(25);
		advance(0.5);

		const late = ctx.oscillators.slice(before);
		expect(late.length).toBeGreaterThan(0);
		for (const oscillator of late) expect(oscillator.startTime).toBeGreaterThanOrEqual(lateTime);
	});

	test("schedules notes only within 150ms of the audio clock", () => {
		const { ctx, player, advance } = setupPlayer();
		player.unlock();
		player.setWanted(true);

		for (let check = 0; check < 20; check++) {
			for (const oscillator of ctx.oscillators) {
				expect(oscillator.startTime).toBeLessThan(ctx.currentTime + 0.15);
			}
			advance(0.25);
		}
		expect(Math.max(...ctx.oscillators.map((node) => node.startTime))).toBeGreaterThan(4.5);
	});
});

class FakeDocument extends EventTarget {
	hidden = false;
}

function bindFake() {
	const target = new FakeDocument();
	const player = { unlock: vi.fn(), setHidden: vi.fn() };
	const cleanup = bindMusicLifecycle(target, player);
	return { target, player, cleanup };
}

describe("bindMusicLifecycle", () => {
	test("every pointerdown, pointerup, and keydown calls unlock", () => {
		const { target, player } = bindFake();

		target.dispatchEvent(new Event("pointerdown"));
		target.dispatchEvent(new Event("pointerup"));
		target.dispatchEvent(new Event("keydown"));
		target.dispatchEvent(new Event("pointerdown"));

		expect(player.unlock).toHaveBeenCalledTimes(4);
	});

	test("visibilitychange passes hidden to setHidden", () => {
		const { target, player } = bindFake();

		target.hidden = true;
		target.dispatchEvent(new Event("visibilitychange"));
		target.hidden = false;
		target.dispatchEvent(new Event("visibilitychange"));

		expect(player.setHidden.mock.calls).toEqual([[true], [false]]);
	});

	test("cleanup removes every listener", () => {
		const { target, player, cleanup } = bindFake();

		cleanup();
		target.dispatchEvent(new Event("pointerdown"));
		target.dispatchEvent(new Event("pointerup"));
		target.dispatchEvent(new Event("keydown"));
		target.dispatchEvent(new Event("visibilitychange"));

		expect(player.unlock).not.toHaveBeenCalled();
		expect(player.setHidden).not.toHaveBeenCalled();
	});
});
