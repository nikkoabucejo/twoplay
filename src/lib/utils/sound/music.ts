import { getGraph, type SoundGraph } from "./graph.js";

export type Note = {
	voice: "pad" | "stab" | "arp" | "bass" | "lead" | "bell" | "hat";
	frequency: number;
	duration: number;
};

export type MusicScene = "default" | "searching" | "win" | "lose" | "draw";

const OUTCOME_SCENES = { win: "win", loss: "lose", draw: "draw" } as const;

export function musicSceneOf({
	outcome,
	searching
}: {
	outcome: "win" | "loss" | "draw" | null;
	searching: boolean;
}): MusicScene {
	if (outcome) return OUTCOME_SCENES[outcome];
	return searching ? "searching" : "default";
}

const STEPS_PER_BAR = 16;
const STEPS_PER_BEAT = 4;

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

export function stepSeconds(bpm: number): number {
	return 60 / bpm / STEPS_PER_BEAT;
}

type Step = {
	bar: number;
	beat: number;
	add: (voice: Exclude<Note["voice"], "hat">, note: number, length: number) => void;
	hat: () => void;
};

function playEntries(
	entries: readonly Entry[],
	{ beat, add }: Step,
	voice: "bass" | "lead",
	transpose = 0
): void {
	for (const [at, note, length] of entries) {
		if (at === beat) add(voice, note + transpose, length);
	}
}

function playDefault(step: Step): void {
	const { bar, beat, add } = step;
	const chord = CHORDS[bar % CHORDS.length];
	if (beat === 0) {
		for (const note of chord) add("pad", note, STEPS_PER_BAR);
	}
	if (beat % 2 === 0) add("arp", chord[ARPEGGIO[beat / 2]] + 12, 2);
	playEntries(BASS_LINES[bar % CHORDS.length], step, "bass");
	playEntries(MELODY[bar], step, "lead");
}

/** [step, semitones above the root, length]: a 3-3-2 figure that pushes against the beat. */
const PUMP: readonly Entry[] = [
	[0, 0, 2],
	[3, 0, 2],
	[6, 12, 1],
	[8, 0, 2],
	[11, 0, 2],
	[14, 7, 1]
];

/** [step, length] for the bar's first four melody notes, clipped to a riff. */
const RIFF = [
	[0, 2],
	[3, 2],
	[6, 3],
	[10, 2]
] as const;

function playSearching(step: Step): void {
	const { bar, beat, add, hat } = step;
	const chord = CHORDS[bar % CHORDS.length];
	const [[, root]] = BASS_LINES[bar % CHORDS.length];
	add("arp", chord[ARPEGGIO[beat % ARPEGGIO.length]] + 12, 1);
	if (beat % STEPS_PER_BEAT === 2) {
		for (const note of chord) add("stab", note, 1);
		hat();
	}
	playEntries(PUMP, step, "bass", root);
	for (const [index, [at, length]] of RIFF.entries()) {
		if (at === beat) add("lead", MELODY[bar][index][1], length);
	}
}

/**
 * Fmaj7, G7, Cadd9, Am7: the Em7 slot resolves to the tonic. Each spans under an octave, so the
 * arpeggio climbs two octaves without repeating a pitch.
 */
const WIN_CHORDS = [
	[53, 57, 60, 64],
	[55, 59, 62, 65],
	[52, 55, 60, 62],
	[55, 57, 60, 64]
] as const;
const WIN_ROOTS = [41, 43, 36, 45] as const;

/** [step, semitones above the root, length]: dotted 8ths bouncing up an octave. */
const BOUNCE: readonly Entry[] = [
	[0, 0, 3],
	[3, 12, 1],
	[4, 0, 3],
	[7, 12, 1],
	[8, 0, 3],
	[11, 12, 1],
	[12, 0, 2],
	[14, 12, 2]
];

function playWin(step: Step): void {
	const { bar, beat, add } = step;
	const chord = WIN_CHORDS[bar % WIN_CHORDS.length];
	if (beat % 8 === 0) {
		for (const note of chord) add("pad", note, 8);
	}
	if (beat % 2 === 0) add("arp", chord[(beat / 2) % chord.length] + (beat < 8 ? 12 : 24), 2);
	if (beat % 8 === 6) add("bell", chord[3] + 24, 2);
	playEntries(BOUNCE, step, "bass", WIN_ROOTS[bar % WIN_ROOTS.length]);
	playEntries(MELODY[bar], step, "lead", 12);
}

/** Fm6, G6, Ebmaj7, Am7: the iv and bIII borrowed from C minor. */
const LOSE_CHORDS = [
	[53, 56, 60, 62],
	[55, 59, 62, 64],
	[51, 55, 58, 62],
	[52, 55, 57, 60]
] as const;
const LOSE_ROOTS = [41, 43, 39, 45] as const;

/** Per bar: a melody note and the lower one it sighs down to. */
const SIGHS = [
	[72, 68],
	[74, 71],
	[70, 67],
	[76, 72],
	[68, 65],
	[71, 67],
	[67, 63],
	[72, 69]
] as const;

function playLose({ bar, beat, add }: Step): void {
	const chord = LOSE_CHORDS[bar % LOSE_CHORDS.length];
	if (beat === 0) {
		for (const note of chord) add("pad", note, STEPS_PER_BAR);
		add("bass", LOSE_ROOTS[bar % LOSE_ROOTS.length], STEPS_PER_BAR);
	}
	if (beat % STEPS_PER_BEAT === 0) add("arp", chord[3 - beat / STEPS_PER_BEAT] + 12, 4);
	if (beat === 4) add("lead", SIGHS[bar][0], 4);
	if (beat === 8) add("lead", SIGHS[bar][1], 6);
}

/** Fsus2, Gsus4, Em7sus4, Asus4: no thirds, so nothing leans major or minor. */
const DRAW_CHORDS = [
	[53, 55, 60, 65],
	[55, 60, 62, 67],
	[52, 57, 59, 62],
	[52, 57, 62, 64]
] as const;
const DRAW_ROOTS = [41, 43, 40, 45] as const;

/** Per bar: the one chord tone the melody hovers on. */
const HOVER = [67, 67, 69, 69, 72, 74, 71, 76] as const;

function playDraw({ bar, beat, add }: Step): void {
	const chord = DRAW_CHORDS[bar % DRAW_CHORDS.length];
	if (beat === 0) {
		for (const note of chord) add("pad", note, STEPS_PER_BAR);
	}
	if (beat % 8 === 0) add("bass", DRAW_ROOTS[bar % DRAW_ROOTS.length], 8);
	if (beat % STEPS_PER_BEAT === 0) add("arp", chord[beat / STEPS_PER_BEAT] + 12, 4);
	if (beat > 0 && beat % STEPS_PER_BEAT === 0) add("lead", HOVER[bar], 3);
}

type Arrangement = {
	bpm: number;
	/** How far odd steps lag, as a fraction of a step. */
	swing: number;
	cutoff: number;
	level: number;
	play: (step: Step) => void;
};

const SCENES = {
	default: { bpm: 76, swing: 0.12, cutoff: 1400, level: 1, play: playDefault },
	searching: { bpm: 100, swing: 0, cutoff: 2800, level: 0.8, play: playSearching },
	win: { bpm: 90, swing: 0, cutoff: 3200, level: 0.85, play: playWin },
	lose: { bpm: 62, swing: 0, cutoff: 650, level: 1, play: playLose },
	draw: { bpm: 76, swing: 0, cutoff: 1000, level: 1, play: playDraw }
} satisfies Record<MusicScene, Arrangement>;

/** The hat's highpass corner. The hat skips the music lowpass, which would leave nothing of it. */
const HAT_HZ = 7000;
const HAT_SECONDS = 0.015;

/** A note as an arrangement writes it, `length` in steps. The hat's length is 0: it is a fixed click. */
type StepNote = Omit<Note, "duration"> & { length: number };

function stepNotes(step: number, scene: MusicScene): StepNote[] {
	const notes: StepNote[] = [];
	SCENES[scene].play({
		bar: Math.floor(step / STEPS_PER_BAR) % BARS,
		beat: step % STEPS_PER_BAR,
		add: (voice, note, length) => notes.push({ voice, frequency: midiToFrequency(note), length }),
		hat: () => notes.push({ voice: "hat", frequency: HAT_HZ, length: 0 })
	});
	return notes;
}

function heldSteps(step: number, scene: MusicScene): StepNote[] {
	return Array.from({ length: step % STEPS_PER_BAR }, (_, index) => index + 1).flatMap((back) =>
		stepNotes(step - back, scene)
			.filter(
				(note) =>
					(note.voice === "pad" || note.voice === "bass") && note.length >= back + STEPS_PER_BEAT
			)
			.map((note) => ({ ...note, length: note.length - back }))
	);
}

function toSeconds(notes: StepNote[], scene: MusicScene): Note[] {
	const seconds = stepSeconds(SCENES[scene].bpm);
	return notes.map(({ length, ...note }) => ({
		...note,
		duration: note.voice === "hat" ? HAT_SECONDS : length * seconds
	}));
}

/** The notes that start on `step` in the scene's arrangement. */
export function notesForStep(step: number, scene: MusicScene = "default"): Note[] {
	return toSeconds(stepNotes(step, scene), scene);
}

/**
 * The pad and bass notes that started earlier in `step`'s bar and still have a beat or more to
 * run, trimmed to what is left. An arrangement that takes over mid-bar starts these at once.
 */
export function heldAt(step: number, scene: MusicScene): Note[] {
	return toSeconds(heldSteps(step, scene), scene);
}

type Voice = {
	type: OscillatorType | "noise";
	peak: number;
	attack: number;
	sustain: number;
	release: number;
};

const VOICES = {
	pad: { type: "triangle", peak: 0.05, attack: 0.2, sustain: 1, release: 0.15 },
	stab: { type: "triangle", peak: 0.035, attack: 0.005, sustain: 0.4, release: 0.05 },
	arp: { type: "triangle", peak: 0.03, attack: 0.01, sustain: 0.4, release: 0.08 },
	bass: { type: "triangle", peak: 0.15, attack: 0.03, sustain: 0.7, release: 0.15 },
	lead: { type: "triangle", peak: 0.1, attack: 0.03, sustain: 0.5, release: 0.25 },
	bell: { type: "sine", peak: 0.04, attack: 0.003, sustain: 0.25, release: 0.3 },
	hat: { type: "noise", peak: 0.06, attack: 0.001, sustain: 0, release: 0.02 }
} satisfies Record<Note["voice"], Voice>;

/** A faint square an octave above the pad, for a hint of chiptune under the lowpass. */
const PAD_SHIMMER: Voice = { ...VOICES.pad, type: "square", peak: 0.006 };

const SCENE_FADE_SECONDS = 0.4;
/** The time constant the previous arrangement's notes fade out with once the next one takes over. */
const RELEASE_SECONDS = 0.05;
/** Ten time constants after the boundary the old arrangement is below -80 dB and is disconnected. */
const RETIRE_SECONDS = RELEASE_SECONDS * 10;
const GLIDE_STEPS = 8;
const MUSIC_LEVEL = 0.2;
const FADE_SECONDS = 1.5;
const TICK_MS = 25;
const LOOKAHEAD_SECONDS = 0.15;
const START_DELAY_SECONDS = 0.05;
const LOOP_STEPS = STEPS_PER_BAR * BARS;

type Timer = ReturnType<typeof setTimeout>;
type MusicDeps = {
	getGraph: () => SoundGraph | null;
	setTimer: (callback: () => void, ms: number) => Timer;
	clearTimer: (id: Timer) => void;
};
type MusicNodes = {
	ctx: AudioContext;
	input: BiquadFilterNode;
	output: GainNode;
	/** The current arrangement's gain; each scene switch fades the old one out and makes a new one. */
	layer: GainNode;
	hat: BiquadFilterNode;
	noise: AudioBuffer;
};

function createLayer(ctx: AudioContext, input: AudioNode, level: number): GainNode {
	const layer = ctx.createGain();
	layer.gain.value = level;
	layer.connect(input);
	return layer;
}

export class MusicPlayer {
	#deps: MusicDeps;
	#isWanted = false;
	#isUnlocked = false;
	#isHidden = false;
	#nodes: MusicNodes | null = null;
	#tickTimer: Timer | null = null;
	#haltTimer: Timer | null = null;
	/** Previous arrangement gains still releasing, each with the timer that disconnects it. */
	#retiring = new Map<GainNode, Timer>();
	#step = 0;
	#nextTime = 0;
	#scene: MusicScene = "default";
	/** The arrangement being scheduled; it catches up with `#scene` on the next beat. */
	#playing: MusicScene = "default";
	#bpm: number = SCENES.default.bpm;
	/** The BPM change per step while gliding to `#playing`'s tempo. */
	#tempoStep = 0;

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

	/** Records the scene. While playing, the scheduler switches to its arrangement on the next beat. */
	setScene(scene: MusicScene): void {
		this.#scene = scene;
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
			this.#holdScene(nodes);
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
			// The music gain is at 0 now, so a layer still releasing can go at once.
			for (const [layer, timer] of this.#retiring) {
				this.#deps.clearTimer(timer);
				layer.disconnect();
			}
			this.#retiring.clear();
		}, FADE_SECONDS * 1000);
	}

	#connect(): MusicNodes | null {
		const graph = this.#deps.getGraph();
		if (!graph) return null;
		const { ctx, master } = graph;
		const { cutoff, level } = SCENES[this.#scene];
		const input = ctx.createBiquadFilter();
		input.type = "lowpass";
		input.frequency.value = cutoff;
		input.Q.value = 0.5;
		const output = ctx.createGain();
		output.gain.value = 0;
		input.connect(output).connect(master);
		const hat = ctx.createBiquadFilter();
		hat.type = "highpass";
		hat.frequency.value = HAT_HZ;
		hat.Q.value = 0.7;
		hat.connect(output);
		const noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.1), ctx.sampleRate);
		const samples = noise.getChannelData(0);
		for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
		const layer = createLayer(ctx, input, level);
		this.#nodes = { ctx, input, output, layer, hat, noise };
		return this.#nodes;
	}

	/** Sets the scene at once, for a start while the music gain is still at 0. */
	#holdScene({ ctx, input, layer }: MusicNodes): void {
		const now = ctx.currentTime;
		const { bpm, cutoff, level } = SCENES[this.#scene];
		input.frequency.cancelScheduledValues(now);
		input.frequency.setValueAtTime(cutoff, now);
		layer.gain.cancelScheduledValues(now);
		layer.gain.setValueAtTime(level, now);
		this.#playing = this.#scene;
		this.#bpm = bpm;
		this.#tempoStep = 0;
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
			while (this.#nextTime < now + START_DELAY_SECONDS) this.#advance();
		}
		const horizon = now + LOOKAHEAD_SECONDS;
		while (this.#nextTime + this.#swing() < horizon) {
			const isSwitch = this.#step % STEPS_PER_BEAT === 0 && this.#playing !== this.#scene;
			if (isSwitch) this.#switch(nodes, this.#nextTime);
			const time = this.#nextTime + this.#swing();
			const held = isSwitch ? heldSteps(this.#step, this.#playing) : [];
			for (const note of [...held, ...stepNotes(this.#step, this.#playing)]) {
				this.#play(nodes, note, time);
			}
			this.#advance();
		}
		this.#tickTimer = this.#deps.setTimer(() => this.#tick(nodes), TICK_MS);
	}

	#advance(): void {
		this.#nextTime += stepSeconds(this.#bpm);
		this.#step = (this.#step + 1) % LOOP_STEPS;
		this.#bpm = this.#glide(this.#bpm);
	}

	/** The BPM one step after `bpm`: one `#tempoStep` toward `#playing`'s tempo, clamped there. */
	#glide(bpm: number): number {
		const target = SCENES[this.#playing].bpm;
		return this.#tempoStep > 0
			? Math.min(target, bpm + this.#tempoStep)
			: Math.max(target, bpm + this.#tempoStep);
	}

	/** How long `length` steps from the current one last while the tempo glides. */
	#seconds(length: number): number {
		let bpm = this.#bpm;
		let seconds = 0;
		for (let index = 0; index < length; index++) {
			seconds += stepSeconds(bpm);
			bpm = this.#glide(bpm);
		}
		return seconds;
	}

	/**
	 * Hands over to `#scene`'s arrangement at `time`, a beat on the grid after every scheduled note:
	 * the old arrangement fades out, the cutoff sweeps from what is sounding, and the tempo glides.
	 */
	#switch(nodes: MusicNodes, time: number): void {
		const { ctx, input } = nodes;
		const { bpm, cutoff, level } = SCENES[this.#scene];
		this.#retire(nodes.layer, time, ctx.currentTime);
		nodes.layer = createLayer(ctx, input, level);
		const now = ctx.currentTime;
		const sounding = input.frequency.value;
		input.frequency.cancelScheduledValues(now);
		input.frequency.setValueAtTime(sounding, now);
		input.frequency.setValueAtTime(sounding, time);
		input.frequency.exponentialRampToValueAtTime(cutoff, time + SCENE_FADE_SECONDS);
		this.#tempoStep = (bpm - this.#bpm) / GLIDE_STEPS;
		this.#playing = this.#scene;
	}

	/** Fades `layer` out from `time` and disconnects it once the fade has finished. */
	#retire(layer: GainNode, time: number, now: number): void {
		layer.gain.setTargetAtTime(0, time, RELEASE_SECONDS);
		const timer = this.#deps.setTimer(
			() => {
				layer.disconnect();
				this.#retiring.delete(layer);
			},
			(time + RETIRE_SECONDS - now) * 1000
		);
		this.#retiring.set(layer, timer);
	}

	#swing(): number {
		return this.#step % 2 === 1 ? stepSeconds(this.#bpm) * SCENES[this.#playing].swing : 0;
	}

	#play(nodes: MusicNodes, note: StepNote, time: number): void {
		const duration = note.voice === "hat" ? HAT_SECONDS : this.#seconds(note.length);
		const output = note.voice === "hat" ? nodes.hat : nodes.layer;
		this.#sound(nodes, VOICES[note.voice], note.frequency, time, duration, output);
		if (note.voice === "pad") {
			this.#sound(nodes, PAD_SHIMMER, note.frequency * 2, time, duration, output);
		}
	}

	#sound(
		{ ctx, noise }: MusicNodes,
		voice: Voice,
		frequency: number,
		time: number,
		duration: number,
		output: AudioNode
	): void {
		let source: AudioScheduledSourceNode;
		if (voice.type === "noise") {
			const noiseSource = ctx.createBufferSource();
			noiseSource.buffer = noise;
			source = noiseSource;
		} else {
			const oscillator = ctx.createOscillator();
			oscillator.type = voice.type;
			oscillator.frequency.setValueAtTime(frequency, time);
			source = oscillator;
		}
		const envelope = ctx.createGain();
		envelope.gain.setValueAtTime(0, time);
		envelope.gain.linearRampToValueAtTime(voice.peak, time + voice.attack);
		envelope.gain.setTargetAtTime(voice.peak * voice.sustain, time + voice.attack, 0.2);
		envelope.gain.setTargetAtTime(0, time + duration, voice.release);
		source.connect(envelope).connect(output);
		source.start(time);
		source.stop(time + duration + voice.release * 6);
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
