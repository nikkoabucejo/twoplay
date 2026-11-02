import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	AboutBuild,
	getAboutBuild,
	setupAboutBuild,
	type AssistWork,
	type Clock,
	type Run,
	type StepWork
} from "./build.svelte.js";
import { PREFERENCES_KEY } from "$lib/utils/storage";
import {
	PAIRABLE,
	STATUS_SECTION,
	TEAM,
	type AssistKind,
	type Step,
	type StepKind
} from "./plan.js";
import { ABOUT_BUILD_KEY, REDUCED_MOTION_QUERY } from "./prepaint.js";
import { WORK } from "./work.js";

const contexts = vi.hoisted(() => new Map<unknown, unknown>());

vi.mock("svelte", async (importOriginal) => ({
	...(await importOriginal<typeof import("svelte")>()),
	getContext: (key: unknown) => contexts.get(key),
	setContext: (key: unknown, value: unknown) => {
		contexts.set(key, value);
		return value;
	}
}));

const KINDS: StepKind[] = [
	"scan",
	"frame",
	"fill",
	"type",
	"size",
	"paint",
	"pop",
	"line",
	"draw",
	"check",
	"test",
	"secure",
	"review"
];

const stubWork = Object.fromEntries(
	KINDS.map((kind) => [kind, (_cursor, _step, run) => run.sleep(40)] satisfies [StepKind, StepWork])
) as Record<StepKind, StepWork>;

let root: HTMLElement;
let main: HTMLElement;
let clock: Clock & {
	requestAnimationFrame: ReturnType<typeof vi.fn<Clock["requestAnimationFrame"]>>;
	cancelAnimationFrame: ReturnType<typeof vi.fn<Clock["cancelAnimationFrame"]>>;
};
let visibility: DocumentVisibilityState;

function mountPage() {
	document.body.innerHTML = `
		<main>
			<div class="about-root">
				<section data-build-section="hero">
					<h1 data-build="type">How twoplay came to be</h1>
					<div data-build="fill"><ul data-build="pop"><li>1</li><li>9</li></ul></div>
				</section>
				<section data-build-section="credit">
					<h2 data-build="type size">Made by Nikko Abucejo</h2>
					<a href="https://github.com/nikkoabucejo/twoplay" data-build="pop test secure">Source</a>
				</section>
			</div>
		</main>`;
	main = document.querySelector("main") as HTMLElement;
	root = document.querySelector(".about-root") as HTMLElement;
}

function createBuild() {
	return new AboutBuild(() => root, { clock, work: stubWork, assists: {} });
}

const VIEW_HEIGHT = 800;
const SCROLL_MAX = 1200;
/** Bottom of the work window at scrollTop 0: the view plus its 15% look-ahead. */
const WINDOW_BOTTOM = VIEW_HEIGHT * 1.15;

/**
 * Lays the page out in a 800px-tall `<main>` that scrolls `scrollMax`, with the credit section at
 * `creditTop`, and records `scrollTop` and the agents' focus after every frame.
 */
function trackScroll(
	build: AboutBuild,
	creditTop = 1200,
	scrollMax = SCROLL_MAX
): { top: number; focus: number[]; elapsed: number }[] {
	Object.defineProperty(main, "scrollHeight", {
		configurable: true,
		value: scrollMax + VIEW_HEIGHT
	});
	Object.defineProperty(main, "clientHeight", { configurable: true, value: VIEW_HEIGHT });
	Object.defineProperty(main, "scrollTop", { configurable: true, writable: true, value: 0 });
	const layout: [string, number][] = [
		[".about-root", 0],
		['[data-build-section="hero"]', 0],
		["h1", 100],
		['[data-build="fill"]', 300],
		['[data-build="pop"]', 300],
		['[data-build-section="credit"]', creditTop],
		["h2", creditTop + 100],
		["a", creditTop + 300]
	];
	const tops = new Map(layout.map(([selector, top]) => [document.querySelector(selector), top]));
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
		if (this === main) return new DOMRect(0, 0, 1280, VIEW_HEIGHT);
		const top = tops.get(this);
		return top === undefined ? new DOMRect() : new DOMRect(0, top - main.scrollTop, 400, 40);
	});
	const frames: { top: number; focus: number[]; elapsed: number }[] = [];
	const startedAt = Date.now();
	clock.requestAnimationFrame.mockImplementation((callback) =>
		Number(
			setTimeout(() => {
				callback(Date.now());
				frames.push({
					top: main.scrollTop,
					elapsed: Date.now() - startedAt,
					focus: build.cursors.flatMap((cursor) => (cursor.focusY === null ? [] : [cursor.focusY]))
				});
			}, 16)
		)
	);
	return frames;
}

/** Credit-section steps take `ms`; the rest take the stub's 40ms. */
function slowCreditWork(ms: number): Record<StepKind, StepWork> {
	return Object.fromEntries(
		KINDS.map(
			(kind) =>
				[
					kind,
					(cursor, step, run) =>
						step.sectionId === "credit" && kind !== "scan" && kind !== "review"
							? run.sleep(ms)
							: stubWork[kind](cursor, step, run)
				] satisfies [StepKind, StepWork]
		)
	) as Record<StepKind, StepWork>;
}

/** Records each claimed step's section, the scroll position, and the time its work began. */
function recordClaims(work: Record<StepKind, StepWork>) {
	const claims: { sectionId: string; kind: StepKind; top: number; at: number }[] = [];
	const recorded = Object.fromEntries(
		KINDS.map(
			(kind) =>
				[
					kind,
					(cursor, step, run) => {
						claims.push({
							sectionId: step.sectionId,
							kind: step.kind,
							top: main.scrollTop,
							at: Date.now()
						});
						return work[kind](cursor, step, run);
					}
				] satisfies [StepKind, StepWork]
		)
	) as Record<StepKind, StepWork>;
	return { claims, work: recorded };
}

const TIERS = [1.5, 2.5, 3];

/**
 * Records the run's pace and `progress` after each frame, from the hero's review on. `progress` is
 * the share of the run past the review that decides the pace tier.
 */
function trackPace(
	inner: Record<StepKind, StepWork>,
	progress: (build: AboutBuild, stepsAtReview: number) => number
) {
	let liveRun: Run | undefined;
	let stepsAtReview: number | null = null;
	let build: AboutBuild | undefined;
	const samples = {
		hero: [] as number[],
		paces: [] as { pace: number; progress: number; at: number }[],
		record(current: AboutBuild) {
			build = current;
			if (!liveRun || !current.isBuilding) return;
			if (stepsAtReview === null) samples.hero.push(liveRun.pace);
			else {
				samples.paces.push({
					pace: liveRun.pace,
					progress: progress(current, stepsAtReview),
					at: Date.now()
				});
			}
		}
	};
	const work = Object.fromEntries(
		KINDS.map(
			(kind) =>
				[
					kind,
					async (cursor, step, run) => {
						liveRun = run;
						await inner[kind](cursor, step, run);
						if (kind === "review" && step.sectionId === "hero" && build) {
							stepsAtReview = build.stepsDone + 1;
						}
					}
				] satisfies [StepKind, StepWork]
		)
	) as Record<StepKind, StepWork>;
	return { work, samples };
}

/** Pace 1 through the hero; after it, never falling and never above the tier, which it settles on. */
function expectTiers({ hero, paces }: ReturnType<typeof trackPace>["samples"]) {
	expect(hero.length).toBeGreaterThan(0);
	for (const pace of hero) expect(pace).toBe(1);
	expect(paces.length).toBeGreaterThan(0);
	const enteredAt = new Map<number, number>();
	const settled = new Set<number>();
	for (const [i, { pace, progress, at }] of paces.entries()) {
		const tier = TIERS[Math.min(Math.floor(progress * TIERS.length), TIERS.length - 1)];
		if (!enteredAt.has(tier)) enteredAt.set(tier, at);
		expect(pace).toBeLessThanOrEqual(tier + 1e-9);
		if (i > 0) expect(pace).toBeGreaterThanOrEqual(paces[i - 1].pace - 1e-9);
		if (at - (enteredAt.get(tier) ?? at) >= 1100) {
			expect(pace).toBeCloseTo(tier, 6);
			settled.add(tier);
		}
	}
	expect(settled).toContain(TIERS[TIERS.length - 1]);
	return settled;
}

async function untilScrolling() {
	for (let ms = 0; main.scrollTop === 0; ms += 160) {
		if (ms > 30_000) throw new Error("Follow-scroll never started");
		await vi.advanceTimersByTimeAsync(160);
	}
}

function stubMatchMedia(isReduced: boolean) {
	vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) => ({ matches: query === REDUCED_MOTION_QUERY && isReduced }) as MediaQueryList
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	contexts.clear();
	sessionStorage.clear();
	localStorage.clear();
	visibility = "visible";
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		get: () => visibility
	});
	clock = {
		now: () => Date.now(),
		setTimeout: (fn, ms) => setTimeout(fn, ms),
		clearTimeout: (id) => clearTimeout(id),
		requestAnimationFrame: vi.fn((callback: FrameRequestCallback) =>
			Number(setTimeout(() => callback(Date.now()), 16))
		),
		cancelAnimationFrame: vi.fn((id: number) => clearTimeout(id))
	};
	stubMatchMedia(false);
	mountPage();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	Reflect.deleteProperty(document, "visibilityState");
	document.documentElement.removeAttribute("data-about-build");
});

/** These tests play whole runs on fake timers; a busy machine stretches them past the 5s default. */
const RUN_TIMEOUT = { timeout: 30_000 };

describe("AboutBuild", RUN_TIMEOUT, () => {
	test("autoplays on a first visit and writes the session flag", () => {
		const build = createBuild();
		expect(build.shouldAutoplay()).toBe(true);
		build.start();
		expect(build.phase).toBe("building");
		expect(sessionStorage.getItem(ABOUT_BUILD_KEY)).not.toBeNull();
		build.destroy();
	});

	test("does not autoplay once the session flag is set, and offers Replay", () => {
		sessionStorage.setItem(ABOUT_BUILD_KEY, "1");
		const build = createBuild();
		expect(build.shouldAutoplay()).toBe(false);
		expect(build.phase).not.toBe("building");
		expect(build.isBuilding).toBe(false);
	});

	test("never autoplays under reduced motion, but replay() starts a run", () => {
		stubMatchMedia(true);
		const build = createBuild();
		expect(build.shouldAutoplay()).toBe(false);
		build.replay();
		expect(build.phase).toBe("building");
		build.destroy();
	});

	test("does not autoplay under the app's Always reduce setting, and replay never follow-scrolls", () => {
		localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ motion: "reduce" }));
		const build = createBuild();
		expect(build.shouldAutoplay()).toBe(false);
		build.replay();
		expect(build.phase).toBe("building");
		expect(build.isFollowing).toBe(false);
		build.destroy();
	});

	test("still plays when sessionStorage throws", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		const build = createBuild();
		expect(build.shouldAutoplay()).toBe(true);
		expect(() => build.start()).not.toThrow();
		expect(build.phase).toBe("building");
		build.destroy();
	});

	test("start puts every target in its wireframe state and clears the pre-paint flag", () => {
		document.documentElement.dataset.aboutBuild = "pending";
		const build = createBuild();
		build.start();
		const states = [...root.querySelectorAll("[data-build]")].map((el) =>
			el.getAttribute("data-build-state")
		);
		expect(states.every((state) => state === "pending")).toBe(true);
		expect(document.documentElement.hasAttribute("data-about-build")).toBe(false);
		build.destroy();
	});

	test("skip ends the run, stops every timer and frame, and restores the page", async () => {
		const build = createBuild();
		build.start();
		await vi.advanceTimersByTimeAsync(3000);
		build.skip();
		expect(build.phase).toBe("done");
		expect(build.hudLabel).toBe("Skipped the build");
		expect(vi.getTimerCount()).toBe(0);
		expect(clock.cancelAnimationFrame).toHaveBeenCalled();
		expect(root.querySelector("[data-build-state]")).toBeNull();
		expect(root.querySelector("[style]")).toBeNull();
		expect(build.cursors).toEqual([]);
		expect(build.effects).toEqual([]);
	});

	test("destroy mid-run leaves no timer, frame, or listener behind", async () => {
		const build = createBuild();
		build.start();
		await vi.advanceTimersByTimeAsync(2500);
		build.destroy();
		expect(vi.getTimerCount()).toBe(0);
		const requests = clock.requestAnimationFrame.mock.calls.length;
		document.dispatchEvent(new Event("visibilitychange"));
		main.dispatchEvent(new WheelEvent("wheel"));
		expect(clock.requestAnimationFrame.mock.calls.length).toBe(requests);
		expect(build.isFollowing).toBe(true);
	});

	test("requests no frame while the tab is hidden, and resumes when visible", async () => {
		const build = createBuild();
		build.start();
		await vi.advanceTimersByTimeAsync(100);
		visibility = "hidden";
		document.dispatchEvent(new Event("visibilitychange"));
		const requests = clock.requestAnimationFrame.mock.calls.length;
		await vi.advanceTimersByTimeAsync(2000);
		expect(clock.requestAnimationFrame.mock.calls.length).toBe(requests);
		visibility = "visible";
		document.dispatchEvent(new Event("visibilitychange"));
		expect(clock.requestAnimationFrame.mock.calls.length).toBe(requests + 1);
		build.destroy();
	});

	test("agents join one at a time in TEAM order, triage first", async () => {
		const build = createBuild();
		build.start();
		await vi.advanceTimersByTimeAsync(10);
		expect(build.cursors.map((cursor) => cursor.agent.name)).toEqual(["triage"]);
		expect(build.joined).toBe(1);
		await vi.advanceTimersByTimeAsync(TEAM[TEAM.length - 1].joinAt);
		expect(build.cursors.map((cursor) => cursor.agent.name)).toEqual(
			TEAM.map((agent) => agent.name)
		);
		expect(build.joined).toBe(9);
		build.destroy();
	});

	test("follow-scroll starts only after the first section's review", async () => {
		let isHeroReviewed = false;
		const work: Record<StepKind, StepWork> = {
			...stubWork,
			review: async (_cursor, step, run) => {
				await run.sleep(40);
				if (step.sectionId === "hero") isHeroReviewed = true;
			}
		};
		const build = new AboutBuild(() => root, { clock, work });
		trackScroll(build);
		build.start();
		for (;;) {
			await vi.advanceTimersByTimeAsync(16);
			if (isHeroReviewed) break;
			expect(main.scrollTop).toBe(0);
		}
		await vi.advanceTimersByTimeAsync(100);
		expect(main.scrollTop).toBeGreaterThan(0);
		build.destroy();
	});

	test("agents only start work below the first section once it is in the work window", async () => {
		const { claims, work } = recordClaims(stubWork);
		const build = new AboutBuild(() => root, { clock, work });
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(build.phase).toBe("done");
		const credit = claims.filter((claim) => claim.sectionId === "credit");
		expect(credit.length).toBeGreaterThan(0);
		for (const claim of credit) expect(1200 - claim.top).toBeLessThan(WINDOW_BOTTOM);
	});

	test("once started, follow-scroll moves every frame and keeps the agents' work in view", async () => {
		const build = createBuild();
		const frames = trackScroll(build);
		build.start();
		await untilScrolling();
		const from = frames.findIndex((frame) => frame.top > 0) - 1;
		while (build.isBuilding) await vi.advanceTimersByTimeAsync(160);
		const run = frames.slice(from);
		for (let i = 1; i < run.length; i++) {
			if (run[i - 1].top < SCROLL_MAX) expect(run[i].top).toBeGreaterThan(run[i - 1].top);
		}
		for (const { top, focus } of run) {
			for (const y of focus) expect(y - top).toBeLessThan(WINDOW_BOTTOM);
		}
	});

	test("follow-scroll eases in, holds one speed, and eases out at the bottom", async () => {
		const build = new AboutBuild(() => root, { clock, work: slowCreditWork(12_000) });
		const frames = trackScroll(build);
		build.start();
		await untilScrolling();
		const from = frames.findIndex((frame) => frame.top > 0) - 1;
		while (build.isBuilding && main.scrollTop < SCROLL_MAX) {
			await vi.advanceTimersByTimeAsync(16);
		}
		expect(main.scrollTop).toBe(SCROLL_MAX);
		const deltas = frames
			.slice(from)
			.map((frame, i, all) => (i === 0 ? 0 : frame.top - all[i - 1].top))
			.slice(1);
		const easeFrames = Math.floor(1000 / 16);
		expect(deltas.length).toBeGreaterThan(easeFrames * 2 + 2);
		const cruise = deltas.slice(easeFrames + 1, -easeFrames - 1);
		for (const delta of cruise) expect(delta).toBeCloseTo(cruise[0], 6);
		const startMs = frames[from + 1].elapsed - 16;
		// Aims to land 3s before the 42s target run, leaving time to gather and leave.
		expect(cruise[0]).toBeCloseTo((16 * SCROLL_MAX) / (39_000 - startMs), 3);
		for (let i = 1; i < easeFrames; i++) expect(deltas[i]).toBeGreaterThan(deltas[i - 1]);
		const landing = deltas.slice(-easeFrames);
		for (let i = 1; i < landing.length; i++) expect(landing[i]).toBeLessThan(landing[i - 1]);
		build.destroy();
	});

	test("builders keep pace 1 through the hero, then step up by thirds of the scroll, scroll unchanged", async () => {
		const { work, samples } = trackPace(stubWork, () => main.scrollTop / SCROLL_MAX);
		const build = new AboutBuild(() => root, { clock, work, assists: {} });
		const frames = trackScroll(build, 2000);
		build.start();
		while (build.isBuilding) {
			await vi.advanceTimersByTimeAsync(16);
			samples.record(build);
		}
		expect(main.scrollTop).toBe(SCROLL_MAX);
		expect([...expectTiers(samples)].sort()).toEqual(TIERS);
		const from = frames.findIndex((frame) => frame.top > 0) - 1;
		const landed = frames.findIndex((frame) => frame.top === SCROLL_MAX);
		const deltas = frames
			.slice(from, landed + 1)
			.map((frame, i, all) => (i === 0 ? 0 : frame.top - all[i - 1].top))
			.slice(1);
		const easeFrames = Math.floor(1000 / 16);
		const cruise = deltas.slice(easeFrames + 1, -easeFrames - 1);
		const startMs = frames[from + 1].elapsed - 16;
		for (const delta of cruise) {
			expect(delta).toBeCloseTo((16 * SCROLL_MAX) / (39_000 - startMs), 3);
		}
		build.destroy();
	});

	test("without follow-scroll, builders step up by thirds of the steps left after the hero", async () => {
		stubMatchMedia(true);
		const { work, samples } = trackPace(stubWork, (build, stepsAtReview) => {
			const total = Math.round(build.stepsDone / build.progress);
			return (build.stepsDone - stepsAtReview) / (total - stepsAtReview);
		});
		const build = new AboutBuild(() => root, { clock, work, assists: {} });
		trackScroll(build);
		build.replay();
		while (build.isBuilding) {
			await vi.advanceTimersByTimeAsync(16);
			samples.record(build);
		}
		expect(build.isFollowing).toBe(false);
		expectTiers(samples);
	});

	test("steps speed up past the base pace while in-view work would scroll out unfinished", async () => {
		let liveRun: Run | undefined;
		const asked = new Map<StepKind, number>([["review", 5000]]);
		const timed: { asked: number; took: number }[] = [];
		const work = Object.fromEntries(
			KINDS.map(
				(kind) =>
					[
						kind,
						async (cursor, step, run) => {
							liveRun = run;
							const ms = step.sectionId === "credit" ? (asked.get(kind) ?? 2400) : 40;
							const at = Date.now();
							await run.sleep(ms);
							timed.push({ asked: ms, took: Date.now() - at });
						}
					] satisfies [StepKind, StepWork]
			)
		) as Record<StepKind, StepWork>;
		const build = new AboutBuild(() => root, { clock, work });
		trackScroll(build, 1000, 8000);
		build.start();
		const paces: { pace: number; progress: number }[] = [];
		for (let ms = 0; build.isBuilding && ms < 90_000; ms += 128) {
			await vi.advanceTimersByTimeAsync(128);
			if (liveRun && build.isBuilding)
				paces.push({ pace: liveRun.pace, progress: main.scrollTop / 8000 });
		}
		expect(build.phase).toBe("done");
		const firstThird = paces.filter(({ progress }) => progress > 0 && progress < 1 / 3);
		expect(Math.max(...firstThird.map(({ pace }) => pace))).toBeGreaterThan(2);
		for (const { pace } of paces) {
			expect(pace).toBeGreaterThanOrEqual(1);
			expect(pace).toBeLessThanOrEqual(3);
		}
		expect(paces[paces.length - 1].pace).toBeCloseTo(3, 6);
		for (const { asked, took } of timed) expect(took).toBeGreaterThanOrEqual(asked / 3 - 16);
	}, 60_000);

	test("work left above the view completes once the scroll lands", async () => {
		const claims: { bottom: number; top: number }[] = [];
		const slow = slowCreditWork(10_000);
		const work = Object.fromEntries(
			KINDS.map(
				(kind) =>
					[
						kind,
						(cursor, step, run) => {
							const { bottom } = run.element(step).getBoundingClientRect();
							claims.push({ bottom, top: main.scrollTop });
							return slow[kind](cursor, step, run);
						}
					] satisfies [StepKind, StepWork]
			)
		) as Record<StepKind, StepWork>;
		const build = new AboutBuild(() => root, { clock, work });
		trackScroll(build, 1000);
		build.start();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(build.phase).toBe("done");
		const above = claims.filter(({ bottom }) => bottom <= 20);
		expect(above.length).toBeGreaterThan(0);
		for (const { top } of above) expect(top).toBe(SCROLL_MAX);
	});

	test("a wheel on the scroll container stops follow-scroll for the rest of the run", async () => {
		const build = createBuild();
		trackScroll(build);
		build.start();
		expect(build.isFollowing).toBe(true);
		await untilScrolling();
		main.dispatchEvent(new WheelEvent("wheel"));
		expect(build.isFollowing).toBe(false);
		const top = main.scrollTop;
		await vi.advanceTimersByTimeAsync(20_000);
		expect(build.isFollowing).toBe(false);
		expect(main.scrollTop).toBe(top);
		build.destroy();
	});

	test("skip and destroy stop follow-scroll", async () => {
		for (const end of ["skip", "destroy"] as const) {
			const build = createBuild();
			trackScroll(build);
			build.start();
			await untilScrolling();
			build[end]();
			const top = main.scrollTop;
			await vi.advanceTimersByTimeAsync(5000);
			expect(main.scrollTop).toBe(top);
		}
	});

	test("never follow-scrolls under reduced motion, and the gate lifts so the run finishes", async () => {
		stubMatchMedia(true);
		const build = createBuild();
		trackScroll(build);
		build.replay();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(main.scrollTop).toBe(0);
		expect(build.isFollowing).toBe(false);
		expect(build.phase).toBe("done");
	});

	test("no new step starts on a target scrolled above the view until the gate lifts", async () => {
		const { claims, work } = recordClaims(stubWork);
		const build = new AboutBuild(() => root, { clock, work });
		trackScroll(build, 600);
		build.start();
		main.dispatchEvent(new WheelEvent("wheel"));
		main.scrollTop = 1000;
		await vi.advanceTimersByTimeAsync(60_000);
		expect(build.phase).toBe("done");
		const firstCredit = claims.findIndex((claim) => claim.sectionId === "credit");
		expect(firstCredit).toBeGreaterThan(0);
		expect(claims[firstCredit].at - claims[firstCredit - 1].at).toBeGreaterThan(1500);
	});

	test("under reduced motion, builds below the view in section order without waiting on the stall", async () => {
		stubMatchMedia(true);
		const { claims, work } = recordClaims(stubWork);
		const build = new AboutBuild(() => root, { clock, work });
		trackScroll(build);
		const startedAt = Date.now();
		build.replay();
		while (build.isBuilding) await vi.advanceTimersByTimeAsync(160);
		expect(Date.now() - startedAt).toBeLessThan(15_000);
		const credit = claims.find((claim) => claim.sectionId === "credit");
		expect(credit?.kind).toBe("scan");
		expect(credit?.at).toBeLessThan(startedAt + 1500);
	});

	test("once a stall lifts the gate after a visitor scroll, it stays lifted", async () => {
		const { claims, work } = recordClaims(stubWork);
		const build = new AboutBuild(() => root, { clock, work });
		trackScroll(build, 600);
		const startedAt = Date.now();
		build.start();
		main.dispatchEvent(new WheelEvent("wheel"));
		main.scrollTop = 1000;
		while (build.isBuilding) await vi.advanceTimersByTimeAsync(160);
		expect(Date.now() - startedAt).toBeLessThan(15_000);
		const credit = claims.filter((claim) => claim.sectionId === "credit");
		expect(credit.length).toBeGreaterThan(2);
	});

	test("a wheel mid-run does not deadlock the gate", async () => {
		const build = createBuild();
		trackScroll(build);
		build.start();
		main.dispatchEvent(new WheelEvent("wheel"));
		await vi.advanceTimersByTimeAsync(60_000);
		expect(build.phase).toBe("done");
	});

	test("moving focus inside the scroll container stops follow-scroll", () => {
		const build = createBuild();
		build.start();
		(root.querySelector("a") as HTMLElement).focus();
		expect(build.isFollowing).toBe(false);
		build.destroy();
	});

	test("hides pop items by attribute, not inline style, until they are popped", async () => {
		const items = [...root.querySelectorAll('[data-build~="pop"] > *')];
		const build = createBuild();
		build.start();
		for (const item of items) {
			expect(item).toHaveAttribute("data-build-hidden");
			expect(item).not.toHaveAttribute("style");
		}
		await vi.advanceTimersByTimeAsync(60_000);
		expect(build.phase).toBe("done");
		expect(root.querySelector("[data-build-hidden]")).toBeNull();
	});

	test("Skip mid-pop leaves no pop animation or inline style behind", async () => {
		const running = new Set<object>();
		Object.defineProperty(Element.prototype, "animate", {
			configurable: true,
			value: () => {
				const animation = { cancel: () => running.delete(animation) };
				running.add(animation);
				return animation;
			}
		});
		let isPopping = false;
		const pop: StepWork = (cursor, step, run) => {
			isPopping = true;
			return WORK.pop(cursor, step, run);
		};
		const build = new AboutBuild(() => root, { clock, work: { ...stubWork, pop } });
		build.start();
		while (!isPopping) await vi.advanceTimersByTimeAsync(16);
		// Past the first item's press, inside its 500ms pop.
		await vi.advanceTimersByTimeAsync(300);
		build.skip();
		Reflect.deleteProperty(Element.prototype, "animate");
		expect(running.size).toBe(0);
		expect(root.querySelector("[style], [data-build-hidden]")).toBeNull();
	});

	test("builds the status bar first, even outside the work window", async () => {
		root.querySelector("section")?.after(
			Object.assign(document.createElement("div"), {
				innerHTML: '<div data-build="pop"><span data-build-item>9 agents</span></div>'
			})
		);
		(root.children[1] as HTMLElement).dataset.buildSection = STATUS_SECTION;
		const { claims, work } = recordClaims(stubWork);
		const build = new AboutBuild(() => root, { clock, work });
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(build.phase).toBe("done");
		expect(claims[0]).toMatchObject({ sectionId: STATUS_SECTION, kind: "scan" });
		const heroReview = claims.findIndex(
			(claim) => claim.sectionId === "hero" && claim.kind === "review"
		);
		const lastStatus = claims.findLastIndex((claim) => claim.sectionId === STATUS_SECTION);
		expect(lastStatus).toBeLessThan(heroReview);
	});

	test("a scroll key stops follow-scroll", () => {
		const build = createBuild();
		build.start();
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown" }));
		expect(build.isFollowing).toBe(false);
		build.destroy();
	});

	test("a completed run restores the page and reports its time", async () => {
		const build = createBuild();
		build.start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(build.phase).toBe("done");
		expect(build.progress).toBe(1);
		expect(build.hudLabel).toMatch(/^Built by 9 agents in \d+\.\ds$/);
		expect(build.cursors).toEqual([]);
		expect(root.querySelector("[data-build-state]")).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	test("reports progress and joined agents in the HUD label while building", async () => {
		const build = createBuild();
		build.start();
		await vi.advanceTimersByTimeAsync(1500);
		expect(build.hudLabel).toMatch(/^2\/9 agents · \d+%$/);
		build.destroy();
	});

	test("replay scrolls the container to the top and starts over", async () => {
		const build = createBuild();
		build.start();
		await vi.advanceTimersByTimeAsync(60_000);
		Object.defineProperty(main, "scrollTop", { configurable: true, writable: true, value: 500 });
		build.replay();
		expect(main.scrollTop).toBe(0);
		expect(build.phase).toBe("building");
		expect(build.joined).toBe(0);
		build.destroy();
	});
});

describe("AboutBuild assists", RUN_TIMEOUT, () => {
	type Started = {
		kind: AssistKind;
		el: Element;
		at: number;
		viewTop: number;
		joins: Step | null;
		joinedStatus: Step["status"] | null;
	};

	/** Steps take 40ms, `type` 2s; records when work starts on each element and every assist. */
	function recordWork() {
		const stepStarts = new Map<Element, number[]>();
		const assists: Started[] = [];
		const active = new Set<object>();
		let overlaps = 0;
		let stepRuns = 0;
		const work = Object.fromEntries(
			KINDS.map(
				(kind) =>
					[
						kind,
						async (cursor, step, run) => {
							const el = run.element(step);
							stepStarts.set(el, [...(stepStarts.get(el) ?? []), Date.now()]);
							await run.sleep(kind === "type" ? 2000 : 40);
							stepRuns++;
						}
					] satisfies [StepKind, StepWork]
			)
		) as Record<StepKind, StepWork>;
		const assist: AssistWork = async (cursor, item, run) => {
			const target = item.joins ?? item.el;
			if (active.has(target)) overlaps++;
			active.add(target);
			assists.push({
				kind: item.kind,
				el: item.el,
				at: Date.now(),
				viewTop: item.el.getBoundingClientRect().top,
				joins: item.joins,
				joinedStatus: item.joins?.status ?? null
			});
			if (item.joins) {
				while (item.joins.status !== "done") await run.sleep(16);
			} else {
				await run.sleep(200);
			}
			active.delete(target);
		};
		const kinds: AssistKind[] = ["measure", "comment", "inspect", "pair"];
		const build = new AboutBuild(() => root, {
			clock,
			work,
			assists: Object.fromEntries(kinds.map((kind) => [kind, assist]))
		});
		return {
			build,
			stepStarts,
			assists,
			stepRuns: () => stepRuns,
			overlaps: () => overlaps
		};
	}

	test("idle agents assist on built elements in view, never on one still being built", async () => {
		const { build, stepStarts, assists } = recordWork();
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(90_000);
		expect(build.phase).toBe("done");
		const onBuilt = assists.filter((assist) => assist.kind !== "pair");
		expect(onBuilt.length).toBeGreaterThan(0);
		for (const assist of onBuilt) {
			for (const start of stepStarts.get(assist.el) ?? []) expect(start).toBeLessThan(assist.at);
			expect(assist.viewTop).toBeLessThan(WINDOW_BOTTOM);
		}
	});

	test("no two agents assist on the same element or step at once", async () => {
		const { build, assists, overlaps } = recordWork();
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(90_000);
		expect(assists.length).toBeGreaterThan(1);
		expect(overlaps()).toBe(0);
	});

	test("an assist kind does not repeat on the same element within its cooldown", async () => {
		const { build, assists } = recordWork();
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(90_000);
		for (const [i, assist] of assists.entries()) {
			const earlier = assists
				.slice(0, i)
				.filter(
					(other) =>
						other.kind === assist.kind && (other.joins ?? other.el) === (assist.joins ?? assist.el)
				);
			for (const other of earlier) expect(assist.at - other.at).toBeGreaterThanOrEqual(6000);
		}
	});

	test("a pair joins a running long step and ends with it", async () => {
		const { build, assists } = recordWork();
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(90_000);
		const pairs = assists.filter((assist) => assist.kind === "pair");
		expect(pairs.length).toBeGreaterThan(0);
		for (const pair of pairs) {
			expect(pair.joins).not.toBeNull();
			expect(PAIRABLE).toContain(pair.joins?.kind);
			expect(pair.joinedStatus).toBe("claimed");
		}
	});

	test("assists do not count toward progress", async () => {
		const { build, assists, stepRuns } = recordWork();
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(90_000);
		expect(assists.length).toBeGreaterThan(0);
		expect(build.stepsDone).toBe(stepRuns());
	});

	test("an idle agent waits between assists that do nothing", async () => {
		const calls: { name: string; at: number }[] = [];
		const kinds: AssistKind[] = ["measure", "comment", "inspect", "pair"];
		const noop: AssistWork = async (cursor) => {
			calls.push({ name: cursor.agent.name, at: Date.now() });
		};
		const build = new AboutBuild(() => root, {
			clock,
			work: slowCreditWork(3000),
			assists: Object.fromEntries(kinds.map((kind) => [kind, noop]))
		});
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(20_000);
		expect(calls.length).toBeGreaterThan(1);
		for (const [i, call] of calls.entries()) {
			const previous = calls.slice(0, i).findLast((other) => other.name === call.name);
			if (previous) expect(call.at).toBeGreaterThan(previous.at);
		}
		build.destroy();
	});

	test("measure only spans built elements at least 4px apart", async () => {
		const spans: number[] = [];
		const measure: AssistWork = async (_cursor, item, run) => {
			const to = item.to?.getBoundingClientRect().top ?? Number.NaN;
			spans.push(to - item.el.getBoundingClientRect().bottom);
			await run.sleep(200);
		};
		const build = new AboutBuild(() => root, {
			clock,
			work: slowCreditWork(3000),
			assists: { measure }
		});
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(spans.length).toBeGreaterThan(0);
		for (const span of spans) expect(span).toBeGreaterThanOrEqual(4);
	});

	test("a kind without a work function finishes at once", async () => {
		const build = new AboutBuild(() => root, { clock, work: {}, assists: {} });
		trackScroll(build);
		build.start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(build.phase).toBe("done");
	});
});

describe("setupAboutBuild", () => {
	test("provides the build to getAboutBuild", () => {
		const build = setupAboutBuild(() => root);
		expect(getAboutBuild()).toBe(build);
	});
});

describe("getAboutBuild", () => {
	test("throws before setupAboutBuild", () => {
		expect(() => getAboutBuild()).toThrow();
	});
});
