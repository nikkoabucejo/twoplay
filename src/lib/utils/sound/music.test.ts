import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { SoundGraph } from "./graph.js";
import {
	bindMusicLifecycle,
	heldAt,
	musicSceneOf,
	MusicPlayer,
	notesForStep,
	stepSeconds,
	type MusicScene,
	type Note
} from "./music.js";

const STEPS_PER_BAR = 16;
const STEP_SECONDS = 60 / 76 / 4;
const BAR_SECONDS = STEPS_PER_BAR * STEP_SECONDS;
const LOOP_STEPS = 8 * STEPS_PER_BAR;
const CHORDS = {
	Fmaj7: ["F", "A", "C", "E"],
	G6: ["G", "B", "D", "E"],
	Em7: ["E", "G", "B", "D"],
	Am7: ["A", "C", "E", "G"]
};
const ROOTS = ["F", "G", "E", "A"];
const C_MAJOR = ["C", "D", "E", "F", "G", "A", "B"];
const PITCH_CLASSES = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];

function pitchClass(frequency: number): string {
	const semitones = Math.round(12 * Math.log2(frequency / 440));
	return PITCH_CLASSES[((semitones % 12) + 12) % 12];
}

function steps(note: Note): number {
	return Math.round(note.duration / STEP_SECONDS);
}

function barNotes(bar: number): Note[][] {
	return Array.from({ length: STEPS_PER_BAR }, (_, step) =>
		notesForStep(bar * STEPS_PER_BAR + step)
	);
}

function padChord(bar: number): string[] {
	return notesForStep(bar * STEPS_PER_BAR)
		.filter((note) => note.voice === "pad")
		.map((note) => pitchClass(note.frequency))
		.sort();
}

/** A voice's notes still sounding at `step`, including ones started in an earlier bar or loop. */
function soundingAt(step: number, voice: Note["voice"]): Note[] {
	return Array.from({ length: STEPS_PER_BAR }, (_, back) =>
		notesForStep(LOOP_STEPS + step - back).filter(
			(note) => note.voice === voice && steps(note) > back
		)
	).flat();
}

/** The steps a voice's notes in this bar run to, counted from the bar's first step. */
const SCENES = ["default", "searching", "win", "lose", "draw"] as const;

function sceneBar(bar: number, scene: MusicScene): Note[][] {
	return Array.from({ length: STEPS_PER_BAR }, (_, step) =>
		notesForStep(bar * STEPS_PER_BAR + step, scene)
	);
}

/** The steps of a bar where a voice starts a note. */
function stepsWith(bar: number, scene: MusicScene, voice: Note["voice"]): number[] {
	return sceneBar(bar, scene).flatMap((notes, step) =>
		notes.some((note) => note.voice === voice) ? [step] : []
	);
}

/** The distinct pitch classes of a voice's notes, sorted. */
function chordOf(notes: Note[], voice: Note["voice"]): string[] {
	return [
		...new Set(
			notes.filter((note) => note.voice === voice).map((note) => pitchClass(note.frequency))
		)
	].sort();
}

function noteEnds(bar: number, voice: Note["voice"]): number[] {
	return barNotes(bar).flatMap((notes, step) =>
		notes.filter((note) => note.voice === voice).map((note) => step + steps(note))
	);
}

describe("notesForStep", () => {
	test("Chord loop: bars 0-7 are Fmaj7, G6, Em7, Am7 twice, and bar 8 repeats bar 0", () => {
		const chords = Object.values(CHORDS).map((chord) => [...chord].sort());
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

	test("Phrases cross bar lines: the lead is sounding on the first step of every bar", () => {
		for (let bar = 0; bar < 8; bar++) {
			expect(soundingAt(bar * STEPS_PER_BAR, "lead")).not.toHaveLength(0);
		}
	});

	test("Loop seam: the last bar's lead and bass run up to the loop's restart", () => {
		expect(Math.max(...noteEnds(7, "lead"))).toBeGreaterThanOrEqual(STEPS_PER_BAR);
		expect(Math.max(...noteEnds(7, "bass"))).toBeGreaterThanOrEqual(STEPS_PER_BAR);
	});

	test("No cadence at the seam: the last bar is not the tonic, and its last step is off C", () => {
		expect(padChord(7)).not.toEqual(["C", "E", "G"]);
		expect(padChord(7)).not.toEqual(["B", "C", "E", "G"]);
		const lastStep = LOOP_STEPS - 1;
		for (const voice of ["bass", "lead"] as const) {
			const notes = soundingAt(lastStep, voice);
			expect(notes).not.toHaveLength(0);
			for (const note of notes) expect(pitchClass(note.frequency)).not.toBe("C");
		}
	});

	test("Continuous arpeggio: a chord tone starts on every 8th and lasts to the next one", () => {
		for (let step = 0; step <= LOOP_STEPS; step += 2) {
			const chord = Object.values(CHORDS)[Math.floor(step / STEPS_PER_BAR) % 4];
			const arps = notesForStep(step).filter((note) => note.voice === "arp");
			expect(arps).toHaveLength(1);
			expect(steps(arps[0])).toBe(2);
			expect(chord).toContain(pitchClass(arps[0].frequency));
		}
		for (let step = 0; step < LOOP_STEPS; step++) {
			expect(soundingAt(step, "arp")).toHaveLength(1);
		}
	});

	test("every note has a positive frequency and duration", () => {
		for (let bar = 0; bar < 8; bar++) {
			for (const note of barNotes(bar).flat()) {
				expect(note.frequency).toBeGreaterThan(0);
				expect(note.duration).toBeGreaterThan(0);
			}
		}
	});

	describe("scenes", () => {
		test("every scene keeps the 8-bar loop: bar 8 repeats bar 0", () => {
			for (const scene of SCENES) {
				expect(sceneBar(8, scene)).toEqual(sceneBar(0, scene));
			}
		});

		test("every scene's notes have a positive frequency and duration", () => {
			for (const scene of SCENES) {
				for (let bar = 0; bar < 8; bar++) {
					for (const note of sceneBar(bar, scene).flat()) {
						expect(note.frequency).toBeGreaterThan(0);
						expect(note.duration).toBeGreaterThan(0);
					}
				}
			}
		});

		test("Searching drives: a 16th arpeggio note on every step, one step long at 100 BPM", () => {
			for (let bar = 0; bar < 8; bar++) {
				const chord = Object.values(CHORDS)[bar % 4];
				for (const notes of sceneBar(bar, "searching")) {
					const arps = notes.filter((note) => note.voice === "arp");
					expect(arps).toHaveLength(1);
					expect(arps[0].duration).toBeCloseTo(stepSeconds(100));
					expect(chord).toContain(pitchClass(arps[0].frequency));
				}
			}
		});

		test("Searching drives: the pad turns into offbeat stabs with a hat on steps 2, 6, 10, and 14", () => {
			for (let bar = 0; bar < 8; bar++) {
				expect(stepsWith(bar, "searching", "pad")).toEqual([]);
				expect(stepsWith(bar, "searching", "stab")).toEqual([2, 6, 10, 14]);
				expect(stepsWith(bar, "searching", "hat")).toEqual([2, 6, 10, 14]);
				expect(chordOf(sceneBar(bar, "searching")[2], "stab")).toEqual(
					[...Object.values(CHORDS)[bar % 4]].sort()
				);
			}
		});

		test("Searching drives: a syncopated bass on steps 0, 3, 6, 8, 11, and 14", () => {
			for (let bar = 0; bar < 8; bar++) {
				expect(stepsWith(bar, "searching", "bass")).toEqual([0, 3, 6, 8, 11, 14]);
				const [first] = sceneBar(bar, "searching")[0].filter((note) => note.voice === "bass");
				expect(pitchClass(first.frequency)).toBe(ROOTS[bar % 4]);
			}
		});

		test("Searching drives: the lead plays the bar's first four melody pitches, short", () => {
			for (let bar = 0; bar < 8; bar++) {
				const leads = sceneBar(bar, "searching")
					.flat()
					.filter((note) => note.voice === "lead");
				const melody = barNotes(bar)
					.flat()
					.filter((note) => note.voice === "lead")
					.slice(0, 4);
				expect(leads.map((note) => note.frequency)).toEqual(melody.map((note) => note.frequency));
				for (const note of leads) {
					expect(note.duration).toBeLessThanOrEqual(3 * stepSeconds(100) + 1e-9);
				}
			}
		});

		test("Win lifts: the Em7 bars resolve to Cadd9 on the tonic", () => {
			expect(chordOf(sceneBar(2, "win")[0], "pad")).toEqual(["C", "D", "E", "G"]);
			expect(chordOf(sceneBar(6, "win")[0], "pad")).toEqual(["C", "D", "E", "G"]);
			expect(chordOf(sceneBar(0, "win")[0], "pad")).toEqual([...CHORDS.Fmaj7].sort());
		});

		test("Win lifts: the melody plays the default melody an octave up, on the same steps", () => {
			for (let bar = 0; bar < 8; bar++) {
				const win = sceneBar(bar, "win").map((notes) =>
					notes.filter((note) => note.voice === "lead").map((note) => note.frequency)
				);
				const base = barNotes(bar).map((notes) =>
					notes.filter((note) => note.voice === "lead").map((note) => note.frequency * 2)
				);
				expect(win.length).toBe(base.length);
				for (const [step, frequencies] of base.entries()) {
					expect(win[step]).toHaveLength(frequencies.length);
					for (const [index, frequency] of frequencies.entries()) {
						expect(win[step][index]).toBeCloseTo(frequency);
					}
				}
			}
		});

		test("Win lifts: a rising arpeggio, an octave-bouncing bass, and bells", () => {
			for (let bar = 0; bar < 8; bar++) {
				const notes = sceneBar(bar, "win").flat();
				const arps = notes.filter((note) => note.voice === "arp").map((note) => note.frequency);
				expect(arps).toHaveLength(8);
				for (let index = 1; index < arps.length; index++) {
					expect(arps[index]).toBeGreaterThan(arps[index - 1]);
				}
				const bass = notes.filter((note) => note.voice === "bass").map((note) => note.frequency);
				expect(new Set(bass.map(pitchClass)).size).toBe(1);
				expect(Math.max(...bass) / Math.min(...bass)).toBeCloseTo(2);
				expect(notes.some((note) => note.voice === "bell")).toBe(true);
			}
		});

		test("Lose deflates: bar 0 is Fm6 and bar 2 is Ebmaj7", () => {
			expect(chordOf(sceneBar(0, "lose")[0], "pad")).toEqual(["C", "D", "F", "G#"]);
			expect(chordOf(sceneBar(2, "lose")[0], "pad")).toEqual(["A#", "D", "D#", "G"]);
		});

		test("Lose deflates: fewer notes than default, with one whole-bar bass note on the root", () => {
			for (let bar = 0; bar < 8; bar++) {
				expect(sceneBar(bar, "lose").flat().length).toBeLessThan(barNotes(bar).flat().length);
				const bass = sceneBar(bar, "lose")
					.flat()
					.filter((note) => note.voice === "bass");
				expect(bass).toHaveLength(1);
				expect(bass[0].duration).toBeCloseTo(STEPS_PER_BAR * stepSeconds(62));
			}
		});

		test("Lose deflates: a quarter-note arpeggio and a two-note melody that fall", () => {
			for (let bar = 0; bar < 8; bar++) {
				expect(stepsWith(bar, "lose", "arp")).toEqual([0, 4, 8, 12]);
				for (const voice of ["arp", "lead"] as const) {
					const frequencies = sceneBar(bar, "lose")
						.flat()
						.filter((note) => note.voice === voice)
						.map((note) => note.frequency);
					for (let index = 1; index < frequencies.length; index++) {
						expect(frequencies[index]).toBeLessThan(frequencies[index - 1]);
					}
				}
			}
		});

		test("Draw hovers: every chord is suspended, with no third above its bass root", () => {
			for (let bar = 0; bar < 8; bar++) {
				const [bass] = sceneBar(bar, "draw")[0].filter((note) => note.voice === "bass");
				const root = PITCH_CLASSES.indexOf(pitchClass(bass.frequency));
				for (const name of chordOf(sceneBar(bar, "draw")[0], "pad")) {
					const interval = (PITCH_CLASSES.indexOf(name) - root + 12) % 12;
					expect([3, 4]).not.toContain(interval);
				}
			}
		});

		test("Draw hovers: quarter-note arpeggio, bass on beats 1 and 3, one repeated melody pitch", () => {
			for (let bar = 0; bar < 8; bar++) {
				expect(stepsWith(bar, "draw", "arp")).toEqual([0, 4, 8, 12]);
				expect(stepsWith(bar, "draw", "bass")).toEqual([0, 8]);
				const leads = sceneBar(bar, "draw")
					.flat()
					.filter((note) => note.voice === "lead");
				expect(leads.length).toBeGreaterThan(1);
				expect(new Set(leads.map((note) => note.frequency)).size).toBe(1);
			}
		});
	});
});

describe("musicSceneOf", () => {
	test("Win, lose, and draw: a round result picks its scene", () => {
		expect(musicSceneOf({ outcome: "win", searching: false })).toBe("win");
		expect(musicSceneOf({ outcome: "loss", searching: false })).toBe("lose");
		expect(musicSceneOf({ outcome: "draw", searching: false })).toBe("draw");
	});

	test("Searching for a match: queued with no result is searching", () => {
		expect(musicSceneOf({ outcome: null, searching: true })).toBe("searching");
	});

	test("Result over searching: a result wins over the queue", () => {
		expect(musicSceneOf({ outcome: "loss", searching: true })).toBe("lose");
	});

	test("neither a result nor a queue is default", () => {
		expect(musicSceneOf({ outcome: null, searching: false })).toBe("default");
	});
});

describe("stepSeconds", () => {
	test("a 16th note lasts a quarter of a beat", () => {
		expect(stepSeconds(76)).toBeCloseTo(STEP_SECONDS);
		expect(stepSeconds(100)).toBeCloseTo(0.15);
	});
});

describe("heldAt", () => {
	test("the pad and bass held from earlier in the bar, trimmed to what is left", () => {
		const held = heldAt(8, "lose");
		expect(chordOf(held, "pad")).toEqual(["C", "D", "F", "G#"]);
		expect(
			held.filter((note) => note.voice === "bass").map((note) => pitchClass(note.frequency))
		).toEqual(["F"]);
		for (const note of held) expect(note.duration).toBeCloseTo(8 * stepSeconds(62));
	});

	test("nothing is held on a bar's first step", () => {
		expect(heldAt(STEPS_PER_BAR, "lose")).toEqual([]);
	});

	test("a note with less than a beat left is not picked up", () => {
		expect(heldAt(4, "searching")).toEqual([]);
		expect(heldAt(13, "lose").filter((note) => note.voice === "pad")).toEqual([]);
	});
});

type Automation =
	| { kind: "set" | "ramp" | "exp"; value: number; time: number }
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
	calls: string[] = [];
	setValueAtTime(value: number, time: number) {
		this.calls.push("set");
		this.events.push({ kind: "set", value, time });
	}
	linearRampToValueAtTime(value: number, time: number) {
		this.calls.push("ramp");
		this.events.push({ kind: "ramp", value, time });
	}
	exponentialRampToValueAtTime(value: number, time: number) {
		this.calls.push("exp");
		this.events.push({ kind: "exp", value, time });
	}
	setTargetAtTime(value: number, time: number, timeConstant: number) {
		this.calls.push("target");
		this.events.push({ kind: "target", value, time, timeConstant });
	}
	cancelScheduledValues() {
		this.calls.push("cancel");
	}
	lastRamp() {
		return this.events.findLast((event) => event.kind === "ramp");
	}
}

class FakeNode {
	frequency = new FakeParam();
	gain = new FakeParam();
	Q = new FakeParam();
	type = "";
	buffer: unknown = null;
	outputs: FakeNode[] = [];
	startTime = Infinity;
	stopTime = Infinity;
	disconnectedAt: number | null = null;
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
	disconnect() {
		this.disconnectedAt = FakeContext.now;
	}
}

class FakeContext {
	/** The latest context's clock, so a node can record when it was disconnected. */
	static now = 0;
	#time = 0;
	get currentTime() {
		return this.#time;
	}
	set currentTime(time: number) {
		this.#time = time;
		FakeContext.now = time;
	}
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
	sampleRate = 48000;
	sources: FakeNode[] = [];
	createBuffer(channels: number, length: number) {
		const data = new Float32Array(length);
		return { length, getChannelData: () => data };
	}
	createBufferSource() {
		const node = new FakeNode();
		this.sources.push(node);
		return node;
	}
}

function reaches(from: FakeNode, target: FakeNode): boolean {
	return from === target || from.outputs.some((node) => reaches(node, target));
}

function setupPlayer() {
	FakeContext.now = 0;
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
	/** The arrangement gains, in creation order. Disconnecting keeps `outputs`, so old ones still match. */
	function layers() {
		const [lowpass] = ctx.filters;
		return ctx.gains.filter((node) => node.outputs.includes(lowpass));
	}
	return { ctx, master, getGraph, player, advance, musicGain, layers };
}

const START_DELAY_SECONDS = 0.05;
const LOOKAHEAD_SECONDS = 0.15;
const SCENE_FADE_SECONDS = 0.4;

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

		const played = ctx.oscillators
			.map((node) => node.frequency.events[0].value)
			.filter((frequency) => frequency < 160);
		const pattern = Array.from({ length: LOOP_STEPS }, (_, step) => notesForStep(step))
			.flat()
			.filter((note) => note.voice === "bass")
			.map((note) => note.frequency);
		expect(played.length).toBeGreaterThan(8);
		expect(played).toEqual(pattern.slice(0, played.length));
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

	test("Pad crossfade: each chord swells in within 0.25s, holds to its bar's end, and overlaps the next", () => {
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
			expect(valueAt(events, start + 0.1)).toBeLessThan(0.75 * peak);
			expect(valueAt(events, start + 0.25)).toBeGreaterThan(0.95 * peak);
			expect(valueAt(events, end - 0.005)).toBeGreaterThan(0.99 * peak);
			expect(valueAt(events, end + 0.1)).toBeGreaterThan(0.3 * peak);
			expect(valueAt(events, end + 0.5)).toBeLessThan(0.05 * peak);
		}

		const sounding = (time: number) =>
			envelopes.reduce((sum, { events }) => sum + valueAt(events, time), 0);
		const full = sounding(barStarts[0] + BAR_SECONDS / 2);
		for (let time = barStarts[0] + 0.25; time < barStarts[barStarts.length - 1]; time += 0.005) {
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

	describe("setScene", () => {
		function playing() {
			const setup = setupPlayer();
			setup.player.unlock();
			setup.player.setWanted(true);
			return setup;
		}

		/** When the latest scene change took over: the cutoff holds until then, then ramps. */
		function boundaryOf(ctx: FakeContext): number {
			const hold = ctx.filters[0].frequency.events.at(-2);
			if (hold?.kind !== "set") throw new Error("no scene change was scheduled");
			return hold.time;
		}

		function startTimes(nodes: FakeNode[], from = 0): number[] {
			return [...new Set(nodes.map((node) => node.startTime))]
				.filter((time) => time >= from - 1e-9)
				.sort((a, b) => a - b);
		}

		function gaps(times: number[]): number[] {
			return times.slice(1).map((time, index) => time - times[index]);
		}

		function startedIn(ctx: FakeContext, from: number, to: number): number[] {
			return ctx.oscillators
				.filter((node) => node.startTime >= from - 1e-9 && node.startTime < to - 1e-9)
				.map((node) => node.frequency.events[0].value)
				.sort((a, b) => a - b);
		}

		/** The oscillator frequencies for these notes: a pad note also sounds its shimmer an octave up. */
		function oscillatorsFor(notes: Note[]): number[] {
			return notes
				.filter((note) => note.voice !== "hat")
				.flatMap((note) =>
					note.voice === "pad" ? [note.frequency, note.frequency * 2] : [note.frequency]
				)
				.sort((a, b) => a - b);
		}

		function stepAt(boundary: number): number {
			return Math.round((boundary - START_DELAY_SECONDS) / STEP_SECONDS);
		}

		test("Default is unchanged: 1400 Hz, no hats, stabs, or bells", () => {
			const { ctx, advance } = playing();
			advance(2 * BAR_SECONDS);

			expect(ctx.filters[0].frequency.value).toBe(1400);
			expect(ctx.sources).toHaveLength(0);
			expect(ctx.oscillators.filter((node) => node.type === "sine")).toHaveLength(0);
		});

		test("Change lands on the next beat: the switch is the first beat on the grid after the call", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			const called = ctx.currentTime;

			player.setScene("searching");
			advance(BAR_SECONDS);

			const boundary = boundaryOf(ctx);
			const step = (boundary - START_DELAY_SECONDS) / STEP_SECONDS;
			expect(step).toBeCloseTo(Math.round(step));
			expect(Math.round(step) % 4).toBe(0);
			expect(boundary).toBeGreaterThan(called);
			expect(boundary - called).toBeLessThanOrEqual(4 * STEP_SECONDS + LOOKAHEAD_SECONDS);
		});

		test("Crossfade: the cutoff holds until the boundary, then ramps to the scene's cutoff in 0.4s", () => {
			for (const [scene, cutoff] of [
				["searching", 2800],
				["win", 3200],
				["lose", 650],
				["draw", 1000]
			] as const) {
				const { ctx, player, advance } = playing();
				advance(1);
				player.setScene(scene);
				advance(BAR_SECONDS);

				expect(ctx.filters[0].frequency.events.at(-1)).toEqual({
					kind: "exp",
					value: cutoff,
					time: boundaryOf(ctx) + SCENE_FADE_SECONDS
				});
			}
		});

		test("Arrangement switch: the beat before the boundary is default, the beat from it is searching", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			player.setScene("searching");
			advance(BAR_SECONDS);
			const boundary = boundaryOf(ctx);
			const step = stepAt(boundary);

			const before = [1, 2, 3, 4].flatMap((back) => notesForStep(step - back));
			expect(startedIn(ctx, boundary - 4 * STEP_SECONDS, boundary)).toEqual(oscillatorsFor(before));
			const after = [0, 1, 2, 3].flatMap((ahead) => notesForStep(step + ahead, "searching"));
			expect(startedIn(ctx, boundary, boundary + 3.5 * STEP_SECONDS)).toEqual(
				oscillatorsFor([...heldAt(step, "searching"), ...after])
			);
		});

		test("Lose enters mid-bar: the Fm6 pad and the bass start at the boundary", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			player.setScene("lose");
			advance(BAR_SECONDS);
			const boundary = boundaryOf(ctx);
			const step = stepAt(boundary);

			const expected = [...heldAt(step, "lose"), ...notesForStep(step, "lose")];
			expect(expected.filter((note) => note.voice === "pad")).toHaveLength(4);
			expect(startedIn(ctx, boundary, boundary + 0.01)).toEqual(oscillatorsFor(expected));
		});

		test("Previous arrangement releases: notes before the boundary fade out from it", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			player.setScene("lose");
			advance(BAR_SECONDS);
			const boundary = boundaryOf(ctx);

			const layerOf = (node: FakeNode) => node.outputs[0].outputs[0];
			const released = (node: FakeNode) =>
				layerOf(node).gain.events.some(
					(event) => event.kind === "target" && event.value === 0 && event.time === boundary
				);
			const old = ctx.oscillators.filter((node) => node.startTime < boundary);
			const fresh = ctx.oscillators.filter((node) => node.startTime >= boundary);
			expect(old.length).toBeGreaterThan(0);
			expect(fresh.length).toBeGreaterThan(0);
			for (const node of old) expect(released(node)).toBe(true);
			for (const node of fresh) expect(released(node)).toBe(false);
		});

		test("Previous arrangement disconnects once its release has finished", () => {
			const { ctx, player, advance, layers } = playing();
			advance(1);
			player.setScene("lose");
			advance(BAR_SECONDS);
			const boundary = boundaryOf(ctx);
			const [old, current] = layers();

			expect(current.disconnectedAt).toBeNull();
			const at = old.disconnectedAt;
			if (at === null) throw new Error("the previous arrangement is still connected");
			expect(at).toBeGreaterThanOrEqual(boundary + 0.45);
			expect(at).toBeLessThan(boundary + 0.6);
			expect(valueAt(old.gain.events, at)).toBeLessThan(0.001);
		});

		test("Repeated switches leave only the current arrangement connected", () => {
			const { player, advance, layers } = playing();
			for (const scene of ["searching", "win", "lose", "draw", "default", "searching"] as const) {
				player.setScene(scene);
				advance(1.5);
			}

			const connected = layers().filter((layer) => layer.disconnectedAt === null);
			expect(layers().length).toBeGreaterThan(6);
			expect(connected).toEqual([layers().at(-1)]);
		});

		test("Halt disconnects a releasing arrangement at once and leaves no timers", () => {
			const { ctx, player, advance, layers } = playing();
			advance(1.2);
			player.setWanted(false);
			const halt = ctx.currentTime + 1.5;
			advance(0.8);
			player.setScene("win");
			advance(0.6);
			const [old] = layers();
			expect(boundaryOf(ctx) + 0.5).toBeGreaterThan(halt);
			expect(old.disconnectedAt).toBeNull();

			advance(0.15);

			expect(old.disconnectedAt).toBeGreaterThanOrEqual(halt - 1e-9);
			expect(old.disconnectedAt).toBeLessThan(halt + 0.05);
			expect(vi.getTimerCount()).toBe(0);
		});

		test("Tempo glide: 76 to 100 BPM over 8 steps, every searching step played once in order", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			player.setScene("searching");
			advance(3 * BAR_SECONDS);
			const boundary = boundaryOf(ctx);
			const step = stepAt(boundary);

			const times = startTimes(ctx.oscillators, boundary);
			const glide = Array.from({ length: 12 }, (_, index) =>
				stepSeconds(Math.min(100, 76 + 3 * index))
			);
			const played = gaps(times);
			for (const [index, seconds] of glide.entries()) expect(played[index]).toBeCloseTo(seconds);
			for (let index = 1; index < played.length; index++) {
				expect(played[index]).toBeLessThanOrEqual(played[index - 1] + 1e-9);
			}
			for (const [index, time] of times.slice(0, -1).entries()) {
				const notes = notesForStep(step + index, "searching");
				const held = index === 0 ? heldAt(step, "searching") : [];
				expect(startedIn(ctx, time, time + 0.01)).toEqual(oscillatorsFor([...held, ...notes]));
			}
		});

		const SCENE_BPM = { default: 76, searching: 100, win: 90, lose: 62, draw: 76 } as const;

		/** The start times of `count` steps from `time` while the tempo glides from `from` to `to` BPM over 8 steps. */
		function glideTimes(time: number, from: number, to: number, count: number): number[] {
			const times = [time];
			for (let index = 0; index < count; index++) {
				const bpm = from + (to - from) * Math.min(1, index / 8);
				times.push(times[index] + stepSeconds(bpm));
			}
			return times;
		}

		/** When a note's envelope starts its release. */
		function releaseOf(node: FakeNode): number {
			const release = node.outputs[0].gain.events.findLast(
				(event) => event.kind === "target" && event.value === 0
			);
			if (!release) throw new Error("the note never releases");
			return release.time;
		}

		/**
		 * Every note started in the `count` steps from `step` (at `times[0]`) releases at the step its
		 * length reaches on the gliding grid, measured from its own start.
		 */
		function expectReleasesOnGrid(
			ctx: FakeContext,
			scene: MusicScene,
			step: number,
			times: number[],
			count: number
		) {
			const seconds = stepSeconds(SCENE_BPM[scene]);
			for (let index = 0; index < count; index++) {
				const held = index === 0 ? heldAt(step, scene) : [];
				const expected = [...held, ...notesForStep(step + index, scene)]
					.filter((note) => note.voice !== "hat")
					.flatMap((note) => {
						const span = times[index + Math.round(note.duration / seconds)] - times[index];
						return note.voice === "pad" ? [span, span] : [span];
					})
					.sort((a, b) => a - b);
				const played = ctx.oscillators
					.filter(
						(node) =>
							node.startTime >= times[index] - 1e-9 && node.startTime < times[index + 1] - 1e-9
					)
					.map((node) => releaseOf(node) - node.startTime)
					.sort((a, b) => a - b);
				expect(played).toHaveLength(expected.length);
				for (const [at, span] of expected.entries()) expect(played[at]).toBeCloseTo(span, 6);
			}
		}

		test("Slowing glide: lose's pad and bass from a bar-line boundary end at the next bar line", () => {
			const { ctx, player, advance } = playing();
			advance(2.4);
			player.setScene("lose");
			advance(3 * BAR_SECONDS);
			const boundary = boundaryOf(ctx);
			const step = stepAt(boundary);
			expect(step % STEPS_PER_BAR).toBe(0);

			const times = glideTimes(boundary, 76, 62, 2 * STEPS_PER_BAR + 1);
			const pads = ctx.oscillators.filter(
				(node) => Math.abs(node.startTime - boundary) < 1e-9 && node.type === "triangle"
			);
			const bars = notesForStep(step, "lose").filter(
				(note) => note.voice === "pad" || note.voice === "bass"
			);
			expect(pads.filter((node) => Math.abs(releaseOf(node) - times[16]) < 1e-6)).toHaveLength(
				bars.length
			);
			expectReleasesOnGrid(ctx, "lose", step, times, STEPS_PER_BAR);
		});

		test("Slowing glide: lose's mid-bar pickup holds to the bar line with no gap", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			player.setScene("lose");
			advance(3 * BAR_SECONDS);
			const boundary = boundaryOf(ctx);
			const step = stepAt(boundary);
			expect(step % STEPS_PER_BAR).not.toBe(0);

			const times = glideTimes(boundary, 76, 62, 3 * STEPS_PER_BAR);
			expectReleasesOnGrid(ctx, "lose", step, times, STEPS_PER_BAR);
		});

		test("Speeding glide: searching notes end on the grid, not past the next bar line", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			player.setScene("searching");
			advance(3 * BAR_SECONDS);
			const boundary = boundaryOf(ctx);
			const step = stepAt(boundary);

			const times = glideTimes(boundary, 76, 100, 3 * STEPS_PER_BAR);
			expectReleasesOnGrid(ctx, "searching", step, times, STEPS_PER_BAR);
		});

		test("Slowing glide: win back to default keeps every note on the grid", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			player.setScene("win");
			advance(2 * BAR_SECONDS);
			const winBoundary = boundaryOf(ctx);
			player.setScene("default");
			advance(3 * BAR_SECONDS);
			const boundary = boundaryOf(ctx);

			const winTimes = glideTimes(winBoundary, 76, 90, 4 * STEPS_PER_BAR);
			const offset = winTimes.findIndex((time) => Math.abs(time - boundary) < 1e-6);
			expect(offset).toBeGreaterThan(8);
			const step = stepAt(winBoundary) + offset;
			const times = glideTimes(boundary, 90, 76, 3 * STEPS_PER_BAR);
			expectReleasesOnGrid(ctx, "default", step, times, STEPS_PER_BAR);
		});

		test("Scene tempos: searching 100, win 90, lose 62, and draw 76 BPM once the glide ends", () => {
			for (const [scene, gap] of [
				["searching", stepSeconds(100)],
				["win", stepSeconds(90)],
				["lose", 4 * stepSeconds(62)],
				["draw", 4 * stepSeconds(76)]
			] as const) {
				const { ctx, player, advance } = playing();
				advance(1);
				player.setScene(scene);
				advance(3 * BAR_SECONDS);

				const recent = startTimes(ctx.oscillators, ctx.currentTime - BAR_SECONDS);
				expect(Math.min(...gaps(recent))).toBeCloseTo(gap);
			}
		});

		test("Searching hats: a 7 kHz highpass into the music gain, past the lowpass", () => {
			const { ctx, player, advance, musicGain } = playing();
			player.setScene("searching");
			advance(2 * BAR_SECONDS);

			const [lowpass, highpass] = ctx.filters;
			expect(highpass.type).toBe("highpass");
			expect(highpass.frequency.value).toBe(7000);
			expect(highpass.Q.value).toBe(0.7);
			expect(highpass.outputs).toEqual([musicGain()]);
			expect(ctx.sources.length).toBeGreaterThanOrEqual(4);
			for (const hat of ctx.sources) {
				expect(reaches(hat, highpass)).toBe(true);
				expect(reaches(hat, lowpass)).toBe(false);
				expect(hat.outputs[0].gain.events.slice(0, 2)).toEqual([
					{ kind: "set", value: 0, time: hat.startTime },
					{ kind: "ramp", value: 0.06, time: hat.startTime + 0.001 }
				]);
			}
		});

		test("Rapid changes: the cutoff ramps from the sounding value every time", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			const cutoff = ctx.filters[0].frequency;

			for (const [scene, sounding] of [
				["searching", 900],
				["default", 2000],
				["lose", 1500]
			] as const) {
				cutoff.value = sounding;
				cutoff.calls = [];
				player.setScene(scene);
				advance(1.2);

				expect(cutoff.calls).toEqual(["cancel", "set", "set", "exp"]);
				expect(cutoff.events.at(-3)).toMatchObject({ kind: "set", value: sounding });
			}
		});

		test("Rapid changes: no step is doubled, every note ramps from 0, and the last scene wins", () => {
			const { ctx, player, advance } = playing();
			advance(1);

			for (const scene of ["searching", "default", "lose", "win", "draw", "win"] as const) {
				player.setScene(scene);
				advance(0.1);
			}
			advance(3 * BAR_SECONDS);

			for (const node of [...ctx.oscillators, ...ctx.sources]) {
				expect(node.outputs[0].gain.events[0]).toEqual({
					kind: "set",
					value: 0,
					time: node.startTime
				});
			}
			for (const gap of gaps(startTimes(ctx.oscillators))) {
				expect(gap).toBeGreaterThan(stepSeconds(100) - 1e-9);
			}
			const recent = startTimes(ctx.oscillators, ctx.currentTime - BAR_SECONDS);
			expect(Math.min(...gaps(recent))).toBeCloseTo(stepSeconds(90));
			expect(ctx.filters[0].frequency.events.at(-1)?.value).toBe(3200);
		});

		test("Scenes stay under game sounds: the music gain targets 0.2 and arrangement levels stay at most 1", () => {
			const { ctx, player, advance, musicGain } = playing();
			for (const scene of ["searching", "win", "lose", "draw", "default"] as const) {
				player.setScene(scene);
				advance(1.5);
				expect(musicGain().gain.lastRamp()?.value).toBe(0.2);
			}
			const [lowpass] = ctx.filters;
			const layers = ctx.gains.filter((node) => node.outputs.includes(lowpass));
			expect(layers.length).toBeGreaterThan(1);
			for (const layer of layers) {
				for (const event of layer.gain.events) expect(event.value).toBeLessThanOrEqual(1);
			}
		});

		test("Music off: a scene change creates no audio context and schedules nothing", () => {
			const { ctx, getGraph, player, advance } = setupPlayer();
			player.setScene("win");
			player.unlock();
			player.setScene("searching");
			advance(1);

			expect(getGraph).not.toHaveBeenCalled();
			expect(ctx.oscillators).toHaveLength(0);
		});

		test("Hidden tab: the music resumes in the win arrangement and tempo with no sweep", () => {
			const { ctx, player, advance } = playing();
			advance(1);
			player.setHidden(true);
			advance(2);
			const cutoff = ctx.filters[0].frequency;
			cutoff.calls = [];

			player.setScene("win");
			expect(cutoff.calls).toEqual([]);

			player.setHidden(false);
			expect(cutoff.calls).toEqual(["cancel", "set"]);
			expect(cutoff.events.at(-1)).toEqual({ kind: "set", value: 3200, time: ctx.currentTime });
			const resumed = ctx.currentTime;
			advance(BAR_SECONDS);
			const times = startTimes(ctx.oscillators, resumed);
			expect(Math.min(...gaps(times))).toBeCloseTo(stepSeconds(90));
			expect(ctx.oscillators.filter((node) => node.type === "sine").length).toBeGreaterThan(0);
		});
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
