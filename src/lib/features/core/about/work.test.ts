import { describe, expect, test, vi } from "vitest";
import { AgentCursor, type OverlayEffect, type Run } from "./build.svelte.js";
import { TEAM, type Step, type StepKind } from "./plan.js";
import { WORK } from "./work.js";

function stubRun(link: EventTarget): Run {
	return {
		isCompact: false,
		pace: 1,
		cursors: [],
		sleep: () => Promise.resolve(),
		tween: (_ms, fn) => {
			fn(1, 1);
			return Promise.resolve();
		},
		box: () => ({ x: 10, y: 20, w: 200, h: 48 }),
		view: () => ({ x: 0, y: 0, w: 1280, h: 800 }),
		element: () => link as HTMLElement,
		mark: () => {},
		setStyle: () => {},
		clearStyle: () => {},
		texts: () => [],
		popItems: () => [],
		reveal: () => {},
		readouts: () => [],
		add: <E extends OverlayEffect>(effect: Omit<E, "id">) => ({ ...effect, id: 1 }) as E,
		fade: () => {},
		part: () => link as Element,
		chat: () => {},
		regions: new Map()
	};
}

function step(kind: StepKind): Step {
	return {
		index: 0,
		kind,
		sectionId: "credit",
		targetId: kind === "review" ? null : "repo",
		prev: null,
		next: null,
		parentFrame: null,
		status: "claimed"
	};
}

describe("WORK", () => {
	test("click-test, audit, and review never dispatch an event to the page", async () => {
		const link = new EventTarget();
		const clicks = vi.fn();
		link.addEventListener("click", clicks);
		const dispatch = vi.spyOn(link, "dispatchEvent");
		const run = stubRun(link);
		const cursor = new AgentCursor(TEAM[6]);

		for (const kind of ["test", "secure", "review"] as const) {
			await WORK[kind](cursor, step(kind), run);
		}

		expect(clicks).not.toHaveBeenCalled();
		expect(dispatch).not.toHaveBeenCalled();
	});
});
