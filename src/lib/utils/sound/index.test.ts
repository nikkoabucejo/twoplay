import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

class FakeParam {
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
	connect(node: FakeNode) {
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
		return new FakeNode();
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
