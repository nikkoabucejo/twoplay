import { render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import Mood from "./mood.svelte";
import { MoodPresence } from "./mood.svelte.js";
import type { BoardStatus } from "$lib/components/layout";

/** Cloud layers in render order alternate seats: 0, 1, 0, 1, 0. */
const CLOUD_SEATS = [0, 1, 0, 1, 0];

function renderMood(status: BoardStatus | null, searching = false) {
	const mood = new MoodPresence();
	mood.status = status;
	mood.searching = searching;
	const { container } = render(Mood, { props: { mood } });
	const backdrop = container.firstElementChild;
	const clouds = [...container.querySelectorAll<HTMLElement>("[style*='opacity']")];
	return { mood, backdrop, clouds, container };
}

function speedsForSeat(clouds: HTMLElement[], seat: number) {
	return clouds
		.filter((_, i) => CLOUD_SEATS[i] === seat)
		.map((cloud) => cloud.style.getPropertyValue("--blob-speed"));
}

function scalesForSeat(clouds: HTMLElement[], seat: number) {
	return clouds.filter((_, i) => CLOUD_SEATS[i] === seat).map((cloud) => cloud.style.scale);
}

function opacitiesForSeat(clouds: HTMLElement[], seat: number) {
	return clouds.filter((_, i) => CLOUD_SEATS[i] === seat).map((cloud) => cloud.style.opacity);
}

function stubAnimations() {
	const animation = { animationName: "drift-a", updatePlaybackRate: vi.fn() };
	vi.spyOn(Element.prototype, "getAnimations").mockReturnValue([animation as unknown as Animation]);
	return animation;
}

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("Mood", () => {
	test("keeps both seats' colors while a turn is in progress", () => {
		const { backdrop } = renderMood({ type: "turn", player: 0 });
		expect(backdrop).not.toHaveClass("grayscale");
	});

	test("drains the color on a draw", () => {
		const { backdrop } = renderMood({ type: "draw" });
		expect(backdrop).toHaveClass("grayscale");
	});

	test("drains the color while waiting for an opponent", () => {
		const { backdrop } = renderMood({ type: "waiting" });
		expect(backdrop).toHaveClass("grayscale");
	});

	test("fades the loser's clouds out entirely when a seat wins", () => {
		const { clouds } = renderMood({ type: "winner", player: 0 });
		expect(opacitiesForSeat(clouds, 0)).toEqual(["1", "1", "1"]);
		expect(opacitiesForSeat(clouds, 1)).toEqual(["0", "0"]);
	});

	test("dims the waiting seat's clouds during the other seat's turn", () => {
		const { clouds } = renderMood({ type: "turn", player: 1 });
		expect(opacitiesForSeat(clouds, 1)).toEqual(["1", "1"]);
		expect(opacitiesForSeat(clouds, 0)).toEqual(["0.75", "0.75", "0.75"]);
	});

	test("follows status changes after mounting", () => {
		const { mood, backdrop } = renderMood(null);
		expect(backdrop).not.toHaveClass("grayscale");

		mood.status = { type: "draw" };
		flushSync();

		expect(backdrop).toHaveClass("grayscale");
	});

	test("swells seat 0's clouds and shrinks seat 1's as the search starts", () => {
		const { clouds } = renderMood(null, true);
		expect(scalesForSeat(clouds, 0)).toEqual(["1.4", "1.4", "1.4"]);
		expect(scalesForSeat(clouds, 1)).toEqual(["0.8", "0.8"]);
		expect(opacitiesForSeat(clouds, 1)).toEqual(["0.7", "0.7"]);
		expect(speedsForSeat(clouds, 0)).toEqual(["16s", "16s", "16s"]);
	});

	test("hands the swell back and forth between the seats while searching", () => {
		vi.useFakeTimers();
		const { clouds } = renderMood(null, true);

		vi.advanceTimersByTime(1400);
		flushSync();
		expect(scalesForSeat(clouds, 0)).toEqual(["0.8", "0.8", "0.8"]);
		expect(scalesForSeat(clouds, 1)).toEqual(["1.4", "1.4"]);

		vi.advanceTimersByTime(1400);
		flushSync();
		expect(scalesForSeat(clouds, 0)).toEqual(["1.4", "1.4", "1.4"]);
	});

	test("holds the swell still under the in-app reduce motion setting", () => {
		vi.useFakeTimers();
		document.documentElement.classList.add("reduce-motion");
		const { clouds } = renderMood(null, true);

		vi.advanceTimersByTime(2800);
		flushSync();
		expect(scalesForSeat(clouds, 0)).toEqual(["1.4", "1.4", "1.4"]);
		document.documentElement.classList.remove("reduce-motion");
	});

	test("keeps the neutral speed when not searching", () => {
		const { clouds } = renderMood(null);
		expect(clouds.map((cloud) => cloud.style.getPropertyValue("--blob-speed"))).toEqual(
			Array(5).fill("16s")
		);
	});

	test("lets a board status win over searching", () => {
		const { clouds } = renderMood({ type: "turn", player: 0 }, true);
		expect(speedsForSeat(clouds, 0)).toEqual(["9s", "9s", "9s"]);
		expect(speedsForSeat(clouds, 1)).toEqual(["22s", "22s"]);
	});

	test("leaves the searching state when the flag clears", () => {
		const { mood, clouds } = renderMood(null, true);
		mood.searching = false;
		flushSync();
		expect(clouds.map((cloud) => cloud.style.scale)).toEqual(Array(5).fill("1"));
	});

	test("plays every cloud animation faster while searching", () => {
		const animation = stubAnimations();
		const { mood } = renderMood(null, true);
		expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(3);

		mood.searching = false;
		flushSync();
		expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1);
	});

	test("keeps the normal pace when a board status wins over searching", () => {
		const animation = stubAnimations();
		renderMood({ type: "turn", player: 0 }, true);
		expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1);
	});
});
