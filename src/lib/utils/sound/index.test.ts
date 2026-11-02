import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

class FakeParam {
	value = 1;
	values: number[] = [];
	setValueAtTime(value: number) {
		this.values.push(value);
	}
	linearRampToValueAtTime() {}
	exponentialRampToValueAtTime() {}
}

class FakeNode {
	frequency = new FakeParam();
	gain = new FakeParam();
	type = "";
	outputs: FakeNode[] = [];
	connect(node: FakeNode) {
		this.outputs.push(node);
		return node;
	}
	start() {}
	stop() {}
}

class FakeAudioContext {
	static created: FakeAudioContext[] = [];
	state: "suspended" | "running" = "suspended";
	currentTime = 0;
	destination = new FakeNode();
	oscillators: FakeNode[] = [];
	gains: FakeNode[] = [];

	constructor() {
		FakeAudioContext.created.push(this);
	}
	async resume() {
		this.state = "running";
	}
	createOscillator() {
		const oscillator = new FakeNode();
		this.oscillators.push(oscillator);
		return oscillator;
	}
	createGain() {
		const gain = new FakeNode();
		this.gains.push(gain);
		return gain;
	}
}

async function loadSound() {
	vi.resetModules();
	return await import("./index.js");
}

function startingPitches() {
	const [context] = FakeAudioContext.created;
	return context.oscillators.map((oscillator) => oscillator.frequency.values[0]);
}

beforeEach(() => {
	FakeAudioContext.created = [];
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function reaches(from: FakeNode, target: FakeNode): boolean {
	return from === target || from.outputs.some((node) => reaches(node, target));
}

function stubBrowserAudio() {
	vi.stubGlobal("window", {});
	vi.stubGlobal("AudioContext", FakeAudioContext);
}

describe("prepareSound", () => {
	test("resumes a context the browser started suspended", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.prepareSound();
		await Promise.resolve();

		expect(FakeAudioContext.created[0].state).toBe("running");
	});

	test("creates the context later sounds reuse", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.prepareSound();
		sound.playMoveSound(0);
		sound.playCaptureSound(1);

		expect(FakeAudioContext.created).toHaveLength(1);
	});
});

describe("playMoveSound", () => {
	test("is a silent no-op during SSR, where there is no window", async () => {
		const sound = await loadSound();
		expect(() => sound.playMoveSound(0)).not.toThrow();
	});

	test("sounds the two seats at different pitches", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.playMoveSound(0);
		sound.playMoveSound(1);

		const [seat0Chirp, , seat1Chirp] = startingPitches();
		expect(seat0Chirp).not.toBe(seat1Chirp);
	});
});

describe("playCaptureSound", () => {
	test("is a silent no-op during SSR, where there is no window", async () => {
		const sound = await loadSound();
		expect(() => sound.playCaptureSound(1)).not.toThrow();
	});

	test("starts seat 0's capture at middle C", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.playCaptureSound(0);

		expect(startingPitches()).toEqual([261.63]);
	});

	test("wraps seat indices past 1 around to the two seat pitches", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.playCaptureSound(0);
		sound.playCaptureSound(2);

		const [seat0, seat2] = startingPitches();
		expect(seat2).toBe(seat0);
	});
});

describe("playTurnChime", () => {
	test("is a silent no-op during SSR, where there is no window", async () => {
		const sound = await loadSound();
		expect(() => sound.playTurnChime()).not.toThrow();
	});

	test("schedules its notes on the shared context", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.prepareSound();
		sound.playTurnChime();

		expect(FakeAudioContext.created).toHaveLength(1);
		expect(FakeAudioContext.created[0].oscillators.length).toBeGreaterThan(0);
	});
});

describe("configureSound", () => {
	test("sound off creates no context and starts no oscillator", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.configureSound({ isEnabled: false, volume: 1 });
		sound.playMoveSound(0);
		sound.playCaptureSound(1);
		sound.playTurnChime();

		expect(FakeAudioContext.created).toHaveLength(0);
	});

	test("volume 0 creates no context and starts no oscillator", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.configureSound({ isEnabled: true, volume: 0 });
		sound.playMoveSound(0);
		sound.playCaptureSound(1);
		sound.playTurnChime();

		expect(FakeAudioContext.created).toHaveLength(0);
	});

	test("routes every sound through a master gain set to the volume", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.configureSound({ isEnabled: true, volume: 0.4 });
		sound.playMoveSound(0);
		sound.playCaptureSound(1);
		sound.playTurnChime();

		const [context] = FakeAudioContext.created;
		const masters = context.gains.filter((gain) => gain.outputs.includes(context.destination));
		expect(masters).toHaveLength(1);
		const [master] = masters;
		expect(master.gain.value).toBe(0.4);
		expect(context.oscillators.length).toBeGreaterThan(0);
		for (const oscillator of context.oscillators) {
			expect(reaches(oscillator, master)).toBe(true);
		}
	});

	test("updates the master gain of a context that already exists", async () => {
		stubBrowserAudio();
		const sound = await loadSound();

		sound.prepareSound();
		sound.configureSound({ isEnabled: true, volume: 0.25 });

		const [context] = FakeAudioContext.created;
		const [master] = context.gains.filter((gain) => gain.outputs.includes(context.destination));
		expect(master.gain.value).toBe(0.25);
	});
});
