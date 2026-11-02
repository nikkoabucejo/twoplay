import { render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { describe, expect, test } from "vitest";
import Mood from "./mood.svelte";
import { MoodPresence } from "./mood.svelte.js";
import type { BoardStatus } from "$lib/components/layout";

/** Cloud layers in render order alternate seats: 0, 1, 0, 1, 0. */
const CLOUD_SEATS = [0, 1, 0, 1, 0];

function renderMood(status: BoardStatus | null) {
	const mood = new MoodPresence();
	mood.status = status;
	const { container } = render(Mood, { props: { mood } });
	const backdrop = container.firstElementChild;
	const clouds = [...container.querySelectorAll<HTMLElement>("[style*='opacity']")];
	return { mood, backdrop, clouds };
}

function opacitiesForSeat(clouds: HTMLElement[], seat: number) {
	return clouds.filter((_, i) => CLOUD_SEATS[i] === seat).map((cloud) => cloud.style.opacity);
}

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
});
