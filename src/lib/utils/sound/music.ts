import { getGraph, type SoundGraph } from "./graph.js";

export type Note = { voice: "pad" | "arp" | "bass" | "lead"; frequency: number; duration: number };

const BPM = 76;
const STEPS_PER_BAR = 16;
const STEP_SECONDS = 60 / BPM / 4;

/**
 * Fmaj7, G6, Em7, Am7 (IV-V-iii-vi in C) as close-voiced MIDI notes, played twice. The loop
 * never lands on C major, and Am7 shares A, C, and E with the Fmaj7 that follows it.
 */
const CHORDS = [
	[53, 57, 60, 64],
	[55, 59, 62, 64],
	[52, 55, 59, 62],
	[52, 55, 57, 60]
] as const;
const BARS = CHORDS.length * 2;

/** Pad tone indexes for the eight 8th notes of a bar, an octave above the pad. */
const ARPEGGIO = [0, 1, 2, 3, 1, 2, 3, 2] as const;

type Entry = readonly [step: number, note: number, length: number];

/** Per chord: [step, MIDI note, length in steps]. The root, its fifth, then a step into the next root. */
const BASS_LINES: readonly Entry[][] = [
	[
		[0, 41, 7],
		[8, 41, 4],
		[12, 48, 2],
		[14, 45, 2]
	],
	[
		[0, 43, 7],
		[8, 43, 4],
		[12, 50, 2],
		[14, 41, 2]
	],
	[
		[0, 40, 7],
		[8, 40, 4],
		[12, 47, 2],
		[14, 43, 2]
	],
	[
		[0, 45, 7],
		[8, 45, 4],
		[12, 40, 2],
		[14, 43, 2]
	]
];

/**
 * Per bar: [step, MIDI note, length in steps]. Bars 0-6 end on a note tied over the bar line, and
 * bar 7 rises E, G into the A that opens bar 0.
 */
const MELODY: readonly Entry[][] = [
	[
		[0, 69, 3],
		[4, 72, 2],
		[6, 76, 4],
		[12, 74, 2],
		[14, 76, 4]
	],
	[
		[4, 74, 2],
		[6, 71, 4],
		[12, 67, 2],
		[14, 71, 4]
	],
	[
		[4, 67, 2],
		[6, 64, 4],
		[11, 67, 2],
		[14, 74, 4]
	],
	[
		[2, 72, 2],
		[4, 69, 4],
		[10, 67, 2],
		[12, 69, 2],
		[14, 72, 4]
	],
	[
		[2, 76, 2],
		[4, 77, 2],
		[6, 76, 3],
		[10, 72, 2],
		[13, 74, 1],
		[14, 76, 4]
	],
	[
		[3, 79, 2],
		[5, 76, 1],
		[6, 74, 4],
		[11, 71, 2],
		[13, 72, 1],
		[14, 74, 4]
	],
	[
		[3, 71, 2],
		[6, 67, 4],
		[10, 71, 2],
		[12, 74, 2],
		[14, 76, 4]
	],
	[
		[3, 72, 2],
		[6, 69, 4],
		[12, 64, 2],
		[14, 67, 2]
	]
];

function midiToFrequency(note: number): number {
	return 440 * 2 ** ((note - 69) / 12);
}

export function notesForStep(step: number): Note[] {
	const bar = Math.floor(step / STEPS_PER_BAR) % BARS;
	const beat = step % STEPS_PER_BAR;
	const chord = CHORDS[bar % CHORDS.length];
	const notes: Note[] = [];
	const add = (voice: Note["voice"], note: number, length: number) =>
		notes.push({ voice, frequency: midiToFrequency(note), duration: length * STEP_SECONDS });
	if (beat === 0) {
		for (const note of chord) add("pad", note, STEPS_PER_BAR);
	}
	if (beat % 2 === 0) add("arp", chord[ARPEGGIO[beat / 2]] + 12, 2);
	for (const [at, note, length] of BASS_LINES[bar % CHORDS.length]) {
		if (at === beat) add("bass", note, length);
	}
	for (const [at, note, length] of MELODY[bar]) {
		if (at === beat) add("lead", note, length);
	}
	return notes;
}

type Voice = {
	type: OscillatorType;
	peak: number;
	attack: number;
	sustain: number;
	release: number;
};

const VOICES = {
	pad: { type: "triangle", peak: 0.05, attack: 0.2, sustain: 1, release: 0.15 },
	arp: { type: "triangle", peak: 0.03, attack: 0.01, sustain: 0.4, release: 0.08 },
	bass: { type: "triangle", peak: 0.15, attack: 0.03, sustain: 0.7, release: 0.15 },
	lead: { type: "triangle", peak: 0.1, attack: 0.03, sustain: 0.5, release: 0.25 }
} satisfies Record<Note["voice"], Voice>;

/** A faint square an octave above the pad, for a hint of chiptune under the lowpass. */
const PAD_SHIMMER: Voice = { ...VOICES.pad, type: "square", peak: 0.006 };

const MUSIC_LEVEL = 0.2;
const FADE_SECONDS = 1.5;
const LOWPASS_HZ = 1400;
const TICK_MS = 25;
const LOOKAHEAD_SECONDS = 0.15;
const START_DELAY_SECONDS = 0.05;
const SWING_SECONDS = STEP_SECONDS * 0.12;
const LOOP_STEPS = STEPS_PER_BAR * BARS;

type Timer = ReturnType<typeof setTimeout>;
type MusicDeps = {
	getGraph: () => SoundGraph | null;
	setTimer: (callback: () => void, ms: number) => Timer;
	clearTimer: (id: Timer) => void;
};
type MusicNodes = { ctx: AudioContext; input: BiquadFilterNode; output: GainNode };

export class MusicPlayer {
	#deps: MusicDeps;
	#isWanted = false;
	#isUnlocked = false;
	#isHidden = false;
	#nodes: MusicNodes | null = null;
	#tickTimer: Timer | null = null;
	#haltTimer: Timer | null = null;
	#step = 0;
	#nextTime = 0;

	constructor(deps: MusicDeps) {
		this.#deps = deps;
	}

	setWanted(isWanted: boolean): void {
		this.#isWanted = isWanted;
		this.#update();
	}

	unlock(): void {
		this.#isUnlocked = true;
		this.#update();
	}

	setHidden(isHidden: boolean): void {
		this.#isHidden = isHidden;
		this.#update();
	}

	#update(): void {
		if (this.#isWanted && this.#isUnlocked && !this.#isHidden) this.#start();
		else this.#fadeOut();
	}

	#start(): void {
		const nodes = this.#nodes ?? this.#connect();
		if (!nodes) return;
		// A gesture that was not a user activation leaves the context suspended; an OS interruption leaves Safari "interrupted".
		if (nodes.ctx.state !== "running") void nodes.ctx.resume();
		if (this.#tickTimer !== null && this.#haltTimer === null) return;
		if (this.#haltTimer !== null) {
			this.#deps.clearTimer(this.#haltTimer);
			this.#haltTimer = null;
		}
		this.#rampTo(nodes, MUSIC_LEVEL);
		if (this.#tickTimer === null) {
			this.#nextTime = Math.max(this.#nextTime, nodes.ctx.currentTime + START_DELAY_SECONDS);
			this.#tick(nodes);
		}
	}

	#fadeOut(): void {
		if (!this.#nodes || this.#tickTimer === null || this.#haltTimer !== null) return;
		this.#rampTo(this.#nodes, 0);
		this.#haltTimer = this.#deps.setTimer(() => {
			if (this.#tickTimer !== null) this.#deps.clearTimer(this.#tickTimer);
			this.#tickTimer = null;
			this.#haltTimer = null;
		}, FADE_SECONDS * 1000);
	}

	#connect(): MusicNodes | null {
		const graph = this.#deps.getGraph();
		if (!graph) return null;
		const { ctx, master } = graph;
		const input = ctx.createBiquadFilter();
		input.type = "lowpass";
		input.frequency.value = LOWPASS_HZ;
		input.Q.value = 0.5;
		const output = ctx.createGain();
		output.gain.value = 0;
		input.connect(output).connect(master);
		this.#nodes = { ctx, input, output };
		return this.#nodes;
	}

	#rampTo({ ctx, output }: MusicNodes, level: number): void {
		const now = ctx.currentTime;
		output.gain.cancelScheduledValues(now);
		output.gain.setValueAtTime(output.gain.value, now);
		output.gain.linearRampToValueAtTime(level, now + FADE_SECONDS);
	}

	#tick(nodes: MusicNodes): void {
		const now = nodes.ctx.currentTime;
		if (this.#nextTime < now) {
			// A throttled timer fell behind: skip the overdue steps rather than play them at once.
			const skipped = Math.ceil((now + START_DELAY_SECONDS - this.#nextTime) / STEP_SECONDS);
			this.#step = (this.#step + skipped) % LOOP_STEPS;
			this.#nextTime += skipped * STEP_SECONDS;
		}
		const horizon = now + LOOKAHEAD_SECONDS;
		while (this.#nextTime + this.#swing() < horizon) {
			const time = this.#nextTime + this.#swing();
			for (const note of notesForStep(this.#step)) this.#play(nodes, note, time);
			this.#step = (this.#step + 1) % LOOP_STEPS;
			this.#nextTime += STEP_SECONDS;
		}
		this.#tickTimer = this.#deps.setTimer(() => this.#tick(nodes), TICK_MS);
	}

	#swing(): number {
		return this.#step % 2 === 1 ? SWING_SECONDS : 0;
	}

	#play(nodes: MusicNodes, note: Note, time: number): void {
		this.#sound(nodes, VOICES[note.voice], note.frequency, time, note.duration);
		if (note.voice === "pad") {
			this.#sound(nodes, PAD_SHIMMER, note.frequency * 2, time, note.duration);
		}
	}

	#sound(
		{ ctx, input }: MusicNodes,
		voice: Voice,
		frequency: number,
		time: number,
		duration: number
	): void {
		const oscillator = ctx.createOscillator();
		const envelope = ctx.createGain();
		oscillator.type = voice.type;
		oscillator.frequency.setValueAtTime(frequency, time);
		envelope.gain.setValueAtTime(0, time);
		envelope.gain.linearRampToValueAtTime(voice.peak, time + voice.attack);
		envelope.gain.setTargetAtTime(voice.peak * voice.sustain, time + voice.attack, 0.2);
		envelope.gain.setTargetAtTime(0, time + duration, voice.release);
		oscillator.connect(envelope).connect(input);
		oscillator.start(time);
		oscillator.stop(time + duration + voice.release * 6);
	}
}

export const music = new MusicPlayer({
	getGraph,
	setTimer: (callback, ms) => setTimeout(callback, ms),
	clearTimer: (id) => clearTimeout(id)
});

const GESTURES = ["pointerdown", "pointerup", "keydown"] as const;

/**
 * Unlocks the player on every gesture (browsers block audio before one, and a later gesture
 * resumes a context that was suspended) and pauses it while hidden.
 */
export function bindMusicLifecycle(
	target: Pick<Document, "addEventListener" | "removeEventListener" | "hidden">,
	player: Pick<MusicPlayer, "unlock" | "setHidden">
): () => void {
	function onGesture() {
		player.unlock();
	}
	function onVisibilityChange() {
		player.setHidden(target.hidden);
	}
	for (const type of GESTURES) target.addEventListener(type, onGesture, { capture: true });
	target.addEventListener("visibilitychange", onVisibilityChange);
	return () => {
		for (const type of GESTURES) target.removeEventListener(type, onGesture, { capture: true });
		target.removeEventListener("visibilitychange", onVisibilityChange);
	};
}
