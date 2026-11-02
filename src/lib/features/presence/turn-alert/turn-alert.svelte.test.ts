import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { shouldAlert, TurnAlert } from "./turn-alert.svelte.js";

const ORIGINAL_TITLE = "ABCD · twoplay";
const ALERT_TITLE = `Your turn · ${ORIGINAL_TITLE}`;

describe("shouldAlert", () => {
	test.each([
		{ previous: null, next: true, isHidden: true, expected: false },
		{ previous: false, next: true, isHidden: true, expected: true },
		{ previous: false, next: true, isHidden: false, expected: false },
		{ previous: true, next: true, isHidden: true, expected: false },
		{ previous: true, next: false, isHidden: true, expected: false }
	])("$previous → $next with hidden $isHidden alerts: $expected", (row) => {
		expect(shouldAlert(row.previous, row.next, row.isHidden)).toBe(row.expected);
	});
});

describe("TurnAlert", () => {
	let isMyTurn = $state<boolean | null>(false);
	let destroy: () => void;

	function fakeDocument() {
		return Object.assign(new EventTarget(), { title: ORIGINAL_TITLE, hidden: true });
	}

	function createAlert({ sound = true, getIsMyTurn = (): boolean | null => isMyTurn } = {}) {
		const document = fakeDocument();
		const playChime = vi.fn();
		destroy = $effect.root(() => {
			new TurnAlert(getIsMyTurn, { document, playChime, preferences: { sound } });
		});
		flushSync();
		return { document, playChime };
	}

	function passTurnToViewer() {
		isMyTurn = true;
		flushSync();
	}

	beforeEach(() => {
		vi.useFakeTimers();
		isMyTurn = false;
	});

	afterEach(() => {
		destroy();
		vi.useRealTimers();
	});

	test("the turn arriving in a hidden tab chimes once and alternates the title", () => {
		const { document, playChime } = createAlert();

		passTurnToViewer();
		expect(document.title).toBe(ALERT_TITLE);
		vi.advanceTimersByTime(1000);
		expect(document.title).toBe(ORIGINAL_TITLE);
		vi.advanceTimersByTime(1000);
		expect(document.title).toBe(ALERT_TITLE);
		expect(playChime).toHaveBeenCalledOnce();
	});

	test("with sound off the title flashes without a chime", () => {
		const { document, playChime } = createAlert({ sound: false });

		passTurnToViewer();

		expect(document.title).toBe(ALERT_TITLE);
		expect(playChime).not.toHaveBeenCalled();
	});

	test("the tab becoming visible restores the original title", () => {
		const { document } = createAlert();
		passTurnToViewer();

		document.hidden = false;
		document.dispatchEvent(new Event("visibilitychange"));
		vi.advanceTimersByTime(3000);

		expect(document.title).toBe(ORIGINAL_TITLE);
	});

	test("the turn leaving the viewer stops the flash", () => {
		const { document } = createAlert();
		passTurnToViewer();
		vi.advanceTimersByTime(1000);

		isMyTurn = false;
		flushSync();
		vi.advanceTimersByTime(3000);

		expect(document.title).toBe(ORIGINAL_TITLE);
	});

	test("teardown restores the original title", () => {
		const { document } = createAlert();
		passTurnToViewer();

		destroy();
		vi.advanceTimersByTime(3000);

		expect(document.title).toBe(ORIGINAL_TITLE);
	});

	test("the turn already being the viewer's on load doesn't alert", () => {
		isMyTurn = true;
		const { document, playChime } = createAlert();

		expect(document.title).toBe(ORIGINAL_TITLE);
		expect(playChime).not.toHaveBeenCalled();
	});

	test("a room that loads on the viewer's turn in a hidden tab doesn't alert", () => {
		isMyTurn = null;
		const { document, playChime } = createAlert();

		passTurnToViewer();

		expect(document.title).toBe(ORIGINAL_TITLE);
		expect(playChime).not.toHaveBeenCalled();
	});

	test("an unknown turn between observations is skipped", () => {
		const { document } = createAlert();
		isMyTurn = null;
		flushSync();

		passTurnToViewer();

		expect(document.title).toBe(ALERT_TITLE);
	});

	test("a spectator, whose turn never comes, is never alerted", () => {
		const { document, playChime } = createAlert({ getIsMyTurn: () => false });

		passTurnToViewer();
		vi.advanceTimersByTime(3000);

		expect(document.title).toBe(ORIGINAL_TITLE);
		expect(playChime).not.toHaveBeenCalled();
	});
});
