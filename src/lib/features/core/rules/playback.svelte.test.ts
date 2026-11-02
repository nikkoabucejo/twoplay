import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BEAT_MS, Playback, isMotionReduced } from "./playback.svelte.js";

describe("Playback", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	test("starts on the finished position", () => {
		const playback = new Playback(() => 2);
		expect(playback.isFinal).toBe(true);
		expect(playback.played).toBe(2);
		expect(playback.target).toBe(1);
	});

	test("aims at each action, then plays it", () => {
		const playback = new Playback(() => 2);
		playback.advance();
		expect(playback.loop).toBe(1);
		expect(playback).toMatchObject({ beat: 0, played: 0, target: 0, isAiming: true });
		playback.advance();
		expect(playback).toMatchObject({ played: 1, target: 0, isAiming: false });
		playback.advance();
		expect(playback).toMatchObject({ played: 1, target: 1, isAiming: true });
	});

	test("holds a refused action longer", () => {
		const playback = new Playback(
			() => 2,
			(action) => action === 1
		);
		playback.advance();
		expect(playback.delay).toBe(BEAT_MS.aim);
		playback.advance();
		expect(playback.delay).toBe(BEAT_MS.play);
		playback.advance();
		playback.advance();
		expect(playback.delay).toBe(BEAT_MS.slowPlay);
	});

	test("plays on a timer until stopped", () => {
		const playback = new Playback(() => 1);
		const stop = playback.play();
		vi.advanceTimersByTime(BEAT_MS.hold);
		expect(playback).toMatchObject({ beat: 0, loop: 1 });
		vi.advanceTimersByTime(BEAT_MS.aim);
		expect(playback.played).toBe(1);
		stop();
		vi.advanceTimersByTime(BEAT_MS.hold * 4);
		expect(playback.played).toBe(1);
	});

	test("showFinal jumps to the finished position", () => {
		const playback = new Playback(() => 3);
		playback.advance();
		playback.showFinal();
		expect(playback.played).toBe(3);
		expect(playback.isFinal).toBe(true);
	});
});

describe("isMotionReduced", () => {
	afterEach(() => document.documentElement.classList.remove("reduce-motion"));

	test("follows the app's reduce-motion class", () => {
		expect(isMotionReduced()).toBe(false);
		document.documentElement.classList.add("reduce-motion");
		expect(isMotionReduced()).toBe(true);
	});
});
