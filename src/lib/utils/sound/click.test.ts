// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { bindClickSounds } from "./click.js";

type Listener = (event: Partial<PointerEvent & KeyboardEvent>) => void;

type KeyOptions = { isTrusted?: boolean; repeat?: boolean };

type PointerOptions = {
	isTrusted?: boolean;
	button?: number;
	ctrlKey?: boolean;
	pointerType?: string;
};

function fakeTarget() {
	const listeners = new Map<string, { listener: Listener; isCapture: boolean }>();
	return {
		listeners,
		addEventListener(type: string, listener: Listener, isCapture: boolean) {
			listeners.set(type, { listener, isCapture });
		},
		removeEventListener(type: string, listener: Listener) {
			if (listeners.get(type)?.listener === listener) listeners.delete(type);
		},
		click(target: EventTarget, isTrusted = true, detail = 1) {
			listeners.get("click")?.listener({ isTrusted, target, detail });
		},
		keydown(
			target: EventTarget,
			key: string,
			{ isTrusted = true, repeat = false }: KeyOptions = {}
		) {
			listeners.get("keydown")?.listener({ isTrusted, target, key, repeat });
		},
		pointerdown(
			target: EventTarget,
			{ isTrusted = true, button = 0, ctrlKey = false, pointerType = "mouse" }: PointerOptions = {}
		) {
			listeners.get("pointerdown")?.listener({ isTrusted, target, button, ctrlKey, pointerType });
		}
	};
}

function render(html: string) {
	document.body.innerHTML = html;
	return (selector: string) => document.querySelector(selector) as Element;
}

function bind(isEnabled = () => true) {
	const target = fakeTarget();
	const play = vi.fn();
	const cleanup = bindClickSounds(target, isEnabled, play);
	return { target, play, cleanup };
}

describe("bindClickSounds", () => {
	test("Button click: a trusted click on a button plays one tick", () => {
		const find = render("<button>Play</button>");
		const { target, play } = bind();

		target.click(find("button"));

		expect(play).toHaveBeenCalledTimes(1);
	});

	test("listens in the capture phase so stopPropagation can't swallow the tick", () => {
		const { target } = bind();
		expect(target.listeners.get("click")?.isCapture).toBe(true);
		expect(target.listeners.get("keydown")?.isCapture).toBe(true);
		expect(target.listeners.get("pointerdown")?.isCapture).toBe(true);
	});

	test("Click inside a control: the icon inside a link ticks once", () => {
		const find = render('<a href="/play"><svg><path id="icon"></path></svg></a>');
		const { target, play } = bind();

		target.click(find("#icon"));

		expect(play).toHaveBeenCalledTimes(1);
	});

	test("Keyboard activation: the click a focused button dispatches on Enter ticks", () => {
		const find = render("<button>Play</button>");
		const button = find("button") as HTMLButtonElement;
		button.focus();
		const { target, play } = bind();

		target.click(document.activeElement as Element);

		expect(play).toHaveBeenCalledTimes(1);
	});

	test("ticks for switches, tabs, menu items, radios, checkboxes, and options", () => {
		const roles = ["switch", "tab", "menuitem", "menuitemradio", "radio", "checkbox", "option"];
		const find = render(roles.map((role) => `<div role="${role}"></div>`).join(""));
		const { target, play } = bind();

		for (const role of roles) target.click(find(`[role=${role}]`));

		expect(play).toHaveBeenCalledTimes(roles.length);
	});

	test("Non-interactive click: plain text, the page background, and a link without href stay silent", () => {
		const find = render("<p>Rules</p><a>Not a link</a>");
		const { target, play } = bind();

		target.click(find("p"));
		target.click(document.body);
		target.click(find("a"));

		expect(play).not.toHaveBeenCalled();
	});

	test("Disabled control: disabled and aria-disabled buttons stay silent", () => {
		const find = render(
			'<button id="off" disabled></button><button id="aria" aria-disabled="true"><span></span></button>'
		);
		const { target, play } = bind();

		target.click(find("#off"));
		target.click(find("#aria span"));

		expect(play).not.toHaveBeenCalled();
	});

	test("a button inside a disabled fieldset stays silent", () => {
		const find = render("<fieldset disabled><button></button></fieldset>");
		const { target, play } = bind();

		target.click(find("button"));

		expect(play).not.toHaveBeenCalled();
	});

	test("Scripted click: an untrusted click stays silent", () => {
		const find = render("<button></button>");
		const { target, play } = bind();

		target.click(find("button"), false);

		expect(play).not.toHaveBeenCalled();
	});

	test("controls inside an inert region stay silent", () => {
		const find = render("<div inert><button></button></div>");
		const { target, play } = bind();

		target.click(find("button"));

		expect(play).not.toHaveBeenCalled();
	});

	test('Board cell: a control inside data-sfx="off" stays silent', () => {
		const find = render('<div data-sfx="off"><button></button></div>');
		const { target, play } = bind();

		target.click(find("button"));

		expect(play).not.toHaveBeenCalled();
	});

	test("Click sounds off: isEnabled false stays silent and is read at click time", () => {
		const find = render("<button></button>");
		let isEnabled = false;
		const { target, play } = bind(() => isEnabled);

		target.click(find("button"));
		expect(play).not.toHaveBeenCalled();

		isEnabled = true;
		target.click(find("button"));
		expect(play).toHaveBeenCalledTimes(1);
	});

	test("Keyboard activation: Enter and Space on a switch tick, since bits-ui toggles without a click", () => {
		const find = render('<button role="switch"></button>');
		const { target, play } = bind();

		target.keydown(find("[role=switch]"), "Enter");
		target.keydown(find("[role=switch]"), " ");

		expect(play).toHaveBeenCalledTimes(2);
	});

	test("Keyboard activation: Enter on menu items ticks, though bits-ui forwards an untrusted click", () => {
		const roles = ["menuitem", "menuitemradio", "menuitemcheckbox"];
		const find = render(roles.map((role) => `<div role="${role}"><span></span></div>`).join(""));
		const { target, play } = bind();

		for (const role of roles) {
			target.keydown(find(`[role=${role}] span`), "Enter");
			target.click(find(`[role=${role}]`), false);
		}

		expect(play).toHaveBeenCalledTimes(roles.length);
	});

	test("keydown stays silent for native buttons and links, which tick on their own click", () => {
		const find = render('<button></button><a href="/play"></a><div role="tab"></div>');
		const { target, play } = bind();

		target.keydown(find("button"), "Enter");
		target.keydown(find("a"), "Enter");
		target.keydown(find("[role=tab]"), " ");

		expect(play).not.toHaveBeenCalled();
	});

	test("keydown stays silent for other keys, repeats, and untrusted events", () => {
		const find = render('<button role="switch"></button>');
		const { target, play } = bind();

		target.keydown(find("button"), "Tab");
		target.keydown(find("button"), "Enter", { repeat: true });
		target.keydown(find("button"), "Enter", { isTrusted: false });

		expect(play).not.toHaveBeenCalled();
	});

	test("keydown applies the same disabled, inert, data-sfx, and isEnabled gating", () => {
		const find = render(
			'<button id="off" role="switch" disabled></button>' +
				'<div id="aria" role="menuitem" aria-disabled="true"></div>' +
				'<div inert><button id="inert" role="switch"></button></div>' +
				'<div data-sfx="off"><button id="sfx" role="switch"></button></div>' +
				'<button id="on" role="switch"></button>'
		);
		const { target, play } = bind(() => false);
		const enabled = bind();

		for (const id of ["#off", "#aria", "#inert", "#sfx"]) enabled.target.keydown(find(id), "Enter");
		target.keydown(find("#on"), "Enter");

		expect(enabled.play).not.toHaveBeenCalled();
		expect(play).not.toHaveBeenCalled();
	});

	test("a keyboard click that follows a keydown tick on the same switch does not tick again", () => {
		const find = render('<button role="switch"></button>');
		const { target, play } = bind();
		const toggle = find("button");

		target.keydown(toggle, " ");
		target.click(toggle, true, 0);
		expect(play).toHaveBeenCalledTimes(1);

		target.click(toggle);
		expect(play).toHaveBeenCalledTimes(2);
	});

	test("Popup trigger: a menu trigger that opens on pointerdown ticks once, though its click lands on <html>", () => {
		const find = render('<button aria-haspopup="menu"><span></span></button>');
		const { target, play } = bind();

		target.pointerdown(find("button span"));
		target.click(document.documentElement);

		expect(play).toHaveBeenCalledTimes(1);
	});

	test("Popup trigger: a popover trigger whose click lands on it ticks once, then the next click ticks again", () => {
		const find = render('<button aria-haspopup="dialog"></button>');
		const { target, play } = bind();
		const trigger = find("button");

		target.pointerdown(trigger);
		target.click(trigger);
		expect(play).toHaveBeenCalledTimes(1);

		target.pointerdown(trigger);
		target.click(trigger);
		expect(play).toHaveBeenCalledTimes(2);
	});

	test("pointerdown stays silent off popup triggers, for other buttons, touch, ctrl, and untrusted events", () => {
		const find = render(
			'<button id="plain"></button><button id="none" aria-haspopup="false"></button><button id="menu" aria-haspopup="menu"></button>'
		);
		const { target, play } = bind();

		target.pointerdown(find("#plain"));
		target.pointerdown(find("#none"));
		target.pointerdown(find("#menu"), { button: 2 });
		target.pointerdown(find("#menu"), { ctrlKey: true });
		target.pointerdown(find("#menu"), { pointerType: "touch" });
		target.pointerdown(find("#menu"), { isTrusted: false });

		expect(play).not.toHaveBeenCalled();
	});

	test("Popup trigger: a touch tap on a menu trigger ticks once from its click", () => {
		const find = render('<button aria-haspopup="menu"></button>');
		const { target, play } = bind();
		const trigger = find("button");

		target.pointerdown(trigger, { pointerType: "touch" });
		target.click(trigger);

		expect(play).toHaveBeenCalledTimes(1);
	});

	test("pointerdown applies the same disabled, inert, data-sfx, and isEnabled gating", () => {
		const find = render(
			'<button id="off" aria-haspopup="menu" disabled></button>' +
				'<div inert><button id="inert" aria-haspopup="menu"></button></div>' +
				'<div data-sfx="off"><button id="sfx" aria-haspopup="menu"></button></div>' +
				'<button id="on" aria-haspopup="menu"></button>'
		);
		const enabled = bind();
		const disabled = bind(() => false);

		for (const id of ["#off", "#inert", "#sfx"]) enabled.target.pointerdown(find(id));
		disabled.target.pointerdown(find("#on"));

		expect(enabled.play).not.toHaveBeenCalled();
		expect(disabled.play).not.toHaveBeenCalled();
	});

	test("Popup trigger: Enter and Space on menu and popover triggers tick, since bits-ui opens without a click", () => {
		const find = render(
			'<button id="menu" aria-haspopup="menu"></button><button id="popover" aria-haspopup="dialog"></button>'
		);
		const { target, play } = bind();

		for (const id of ["#menu", "#popover"]) {
			target.keydown(find(id), "Enter");
			target.keydown(find(id), " ");
		}

		expect(play).toHaveBeenCalledTimes(4);
	});

	test("Popup trigger: ArrowDown ticks on a closed menu trigger only, not a submenu item", () => {
		const find = render(
			'<button id="closed" aria-haspopup="menu" aria-expanded="false"></button>' +
				'<button id="open" aria-haspopup="menu" aria-expanded="true"></button>' +
				'<button id="popover" aria-haspopup="dialog" aria-expanded="false"></button>' +
				'<div id="sub" role="menuitem" aria-haspopup="menu" aria-expanded="false"></div>'
		);
		const { target, play } = bind();

		for (const id of ["#closed", "#open", "#popover", "#sub"])
			target.keydown(find(id), "ArrowDown");

		expect(play).toHaveBeenCalledTimes(1);
	});

	test("cleanup removes the listener", () => {
		const find = render("<button></button>");
		const { target, play, cleanup } = bind();

		cleanup();
		target.click(find("button"));

		expect(target.listeners.size).toBe(0);
		expect(play).not.toHaveBeenCalled();
	});
});

type Ramp = { kind: "set" | "linear" | "exponential"; value: number; time: number };

class FakeParam {
	value = 1;
	ramps: Ramp[] = [];
	setValueAtTime(value: number, time: number) {
		this.ramps.push({ kind: "set", value, time });
	}
	setTargetAtTime() {}
	linearRampToValueAtTime(value: number, time: number) {
		this.ramps.push({ kind: "linear", value, time });
	}
	exponentialRampToValueAtTime(value: number, time: number) {
		this.ramps.push({ kind: "exponential", value, time });
	}
}

class FakeNode {
	frequency = new FakeParam();
	detune = new FakeParam();
	gain = new FakeParam();
	type = "";
	outputs: FakeNode[] = [];
	stoppedAt: number | null = null;
	connect(node: FakeNode) {
		this.outputs.push(node);
		return node;
	}
	start() {}
	stop(time: number) {
		this.stoppedAt = time;
	}
}

class FakeAudioContext {
	static created: FakeAudioContext[] = [];
	state = "running";
	currentTime = 0;
	destination = new FakeNode();
	oscillators: FakeNode[] = [];
	gains: FakeNode[] = [];
	constructor() {
		FakeAudioContext.created.push(this);
	}
	async resume() {}
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

/** Pitch classes C, D, E, F, G, A, B as semitones above C. */
const C_MAJOR = new Set([0, 2, 4, 5, 7, 9, 11]);

function isInCMajor(hz: number) {
	const semitonesFromC4 = Math.round(12 * Math.log2(hz / 261.63));
	return C_MAJOR.has(((semitonesFromC4 % 12) + 12) % 12);
}

async function loadSound() {
	vi.resetModules();
	const click = await import("./click.js");
	const graph = await import("./graph.js");
	return { ...click, ...graph };
}

describe("playClickSound", () => {
	beforeEach(() => {
		FakeAudioContext.created = [];
		vi.stubGlobal("AudioContext", FakeAudioContext);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("Tick shape: one short C-major tone that ramps up from 0, peaks quietly, and fades out", async () => {
		const sound = await loadSound();

		sound.playClickSound();

		const [context] = FakeAudioContext.created;
		const [master] = context.gains.filter((gain) => gain.outputs.includes(context.destination));
		expect(context.oscillators).toHaveLength(1);
		const [tone] = context.oscillators;
		expect(["sine", "triangle"]).toContain(tone.type);
		expect(isInCMajor(tone.frequency.ramps[0].value)).toBe(true);
		expect(tone.stoppedAt).toBeLessThanOrEqual(0.04);

		const [envelope] = tone.outputs;
		expect(envelope.outputs).toEqual([master]);
		const ramps = envelope.gain.ramps;
		expect(ramps[0]).toEqual({ kind: "set", value: 0, time: 0 });
		expect(ramps[1].kind).toBe("linear");
		expect(ramps[1].time).toBeGreaterThan(0);
		const peak = Math.max(...ramps.map((ramp) => ramp.value));
		expect(peak).toBeGreaterThanOrEqual(0.035);
		expect(peak).toBeLessThanOrEqual(0.04);
		expect(ramps.at(-1)?.value).toBeLessThan(0.001);
		expect(ramps.at(-1)?.time).toBeLessThanOrEqual(tone.stoppedAt ?? Infinity);
	});

	test("Rapid clicks: a tick within 30ms of the last one on the audio clock is dropped", async () => {
		const sound = await loadSound();

		sound.playClickSound();
		const [context] = FakeAudioContext.created;
		context.currentTime = 0.02;
		sound.playClickSound();
		expect(context.oscillators).toHaveLength(1);

		context.currentTime = 0.031;
		sound.playClickSound();
		expect(context.oscillators).toHaveLength(2);
	});

	test("each tick is detuned at random within ±20 cents", async () => {
		const sound = await loadSound();
		const random = vi.spyOn(Math, "random");

		random.mockReturnValueOnce(0);
		sound.playClickSound();
		const [context] = FakeAudioContext.created;
		context.currentTime = 1;
		random.mockReturnValueOnce(0.999999);
		sound.playClickSound();
		random.mockRestore();

		const [low, high] = context.oscillators.map((tone) => tone.detune.ramps[0].value);
		expect(low).toBe(-20);
		expect(high).toBeCloseTo(20, 3);
	});

	test("Muted page creates no audio context: sound off", async () => {
		const sound = await loadSound();

		sound.configureSound({ isEnabled: false, volume: 1 });
		sound.playClickSound();

		expect(FakeAudioContext.created).toHaveLength(0);
	});

	test("Muted page creates no audio context: volume 0", async () => {
		const sound = await loadSound();

		sound.configureSound({ isEnabled: true, volume: 0 });
		sound.playClickSound();

		expect(FakeAudioContext.created).toHaveLength(0);
	});
});
