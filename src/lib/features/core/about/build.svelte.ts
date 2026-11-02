import { getContext, setContext } from "svelte";
import {
	ACTS,
	PAIRABLE,
	pickStep,
	planSteps,
	STATUS_SECTION,
	TEAM,
	type Act,
	type AssistKind,
	type BuildAgent,
	type BuildTarget,
	type Step,
	type StepGraph,
	type StepKind
} from "./plan.js";
import { ABOUT_BUILD_KEY, isReducedMotion, shouldAutoplay } from "./prepaint.js";
import {
	ASSISTS,
	EASE,
	enter,
	gather,
	leave,
	wander,
	WIREFRAME_SCALE,
	WORK,
	type BandsEffect,
	type PinEffect,
	type ToolEffect
} from "./work.js";

export type Box = { x: number; y: number; w: number; h: number };

type TimerId = ReturnType<typeof setTimeout>;

export type Clock = {
	now(): number;
	setTimeout(fn: () => void, ms: number): TimerId;
	clearTimeout(id: TimerId): void;
	requestAnimationFrame(callback: FrameRequestCallback): number;
	cancelAnimationFrame(id: number): void;
};

export type TargetState = "pending" | "framed" | "filled" | "done";

type Styled = HTMLElement | SVGElement;

export type RippleEffect = { id: number; kind: "ripple"; color: string; x: number; y: number };
export type BadgeEffect = { id: number; kind: "badge"; x: number; y: number; isFading: boolean };
export type GuideEffect = { id: number; kind: "guide"; color: string; axis: "h" | "v"; at: number };
export type RedlineEffect = { id: number; kind: "redline"; x: number; y: number; gap: number };
export type MarqueeEffect = {
	id: number;
	kind: "marquee";
	color: string;
	box: Box;
	t: number;
	isFading: boolean;
};
export type RegionEffect = {
	id: number;
	kind: "region";
	color: string;
	box: Box;
	t: number;
	label: string;
	isOk: boolean;
	isFading: boolean;
};
export type SizePanelEffect = {
	id: number;
	kind: "size";
	color: string;
	x: number;
	y: number;
	t: number;
	from: number;
	to: number;
	isFading: boolean;
};
export type PaintPanelEffect = {
	id: number;
	kind: "paint";
	color: string;
	x: number;
	y: number;
	isFading: boolean;
};
export type OverlayEffect =
	| RippleEffect
	| BadgeEffect
	| GuideEffect
	| RedlineEffect
	| MarqueeEffect
	| RegionEffect
	| SizePanelEffect
	| PaintPanelEffect
	| ToolEffect
	| BandsEffect
	| PinEffect;

/** How long transient effects stay before they are removed. */
const EFFECT_MS: Record<"ripple" | "guide" | "redline", number> = {
	ripple: 500,
	guide: 1200,
	redline: 1300
};
const FADE_MS = 400;
/** Agents only pick steps whose element starts above the visible bottom plus this share of it. */
const LOOK_AHEAD = 0.15;
const ASSIST_COOLDOWN_MS = 6000;
/** An agent pauses this long after an assist, so one that does nothing can't spin the loop. */
const ASSIST_REST_MS = 120;
/** `measure` only spans gaps a redline can show. */
const MEASURE_MIN_GAP = 4;
/** Work this close to the top of `<main>` counts as scrolled away. */
const TOP_GAP = 20;
/** Without follow-scroll, the gate lifts once nothing has been claimed for this long. */
const GATE_STALL_MS = 1500;
/** Whole-run length follow-scroll aims for, by breakpoint. */
const TARGET_RUN_MS = { wide: 42_000, compact: 36_000 };
/** Follow-scroll never plans to take less than this, however late it starts. */
const FOLLOW_MIN_MS = 8000;
/** Follow-scroll lands this long before the target run length, leaving time to gather and leave. */
const FOLLOW_TAIL_MS = 3000;
/** px per ms; the fastest follow-scroll stays readable. */
const FOLLOW_MAX_SPEED = 0.25;
/** Nominal length of one step, for judging whether a target's work fits before it scrolls out. */
const STEP_MS = 1200;
/** Range and smoothing of the catch-up multiplier on step and assist timing. */
const CATCH_UP_MAX = 2.2;
const CATCH_UP_SMOOTH_MS = 500;
/**
 * Builders' base pace for each third after the hero's review: of follow-scroll's distance while it
 * runs, else of the steps left at the review. It never drops, and stays at the last until the end.
 */
const PACE_TIERS = [1.5, 2.3, 2.8];
/** Follow-scroll eases in and out over this long. */
const FOLLOW_EASE_MS = 1000;
/** Agents keep building at least this long after follow-scroll lands, before they gather. */
const LANDED_HOLD_MS = 1000;
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

export class AgentCursor {
	x = $state(0);
	y = $state(0);
	action = $state("");
	bubble = $state<string | null>(null);
	isLeaving = $state(false);
	focusY: number | null = null;

	constructor(readonly agent: BuildAgent) {}
}

/** A `Typed` text. `count` is `null` outside a build, else the number of characters typed. */
export class TypedText {
	count = $state<number | null>(null);
	caretColor = $state<string | null>(null);

	constructor(readonly getText: () => string) {}

	get text(): string {
		return this.getText();
	}
}

/** A `Readout` value. `value` is `null` outside a build, else the number shown while counting. */
export class CountedValue {
	value = $state<number | null>(null);

	constructor(
		readonly getFinal: () => number,
		readonly getFrom: () => number
	) {}
}

export type Run = {
	readonly isCompact: boolean;
	/** Speed-up (1–2.8) already applied to `sleep` and `tween` durations. */
	readonly pace: number;
	readonly cursors: readonly AgentCursor[];
	sleep(ms: number): Promise<void>;
	tween(
		ms: number,
		fn: (t: number, p: number) => void,
		ease?: (p: number) => number
	): Promise<void>;
	/** Root-relative box of an element. */
	box(el: Element): Box;
	/** Root-relative box of the scroll container's visible area. */
	view(): Box;
	element(step: Step): Styled;
	mark(el: Element, state: TargetState): void;
	setStyle(el: Styled, property: string, value: string): void;
	clearStyle(el: Styled, property: string): void;
	texts(target: Element): TypedText[];
	popItems(target: Element): Styled[];
	/** Lifts the hidden state a pop item starts the run in. */
	reveal(item: Element): void;
	readouts(item: Element): CountedValue[];
	add<E extends OverlayEffect>(effect: Omit<E, "id">): E;
	fade(effect: Extract<OverlayEffect, { isFading: boolean }>, delayMs?: number): void;
	/** An element of an overlay effect, marked `data-part` inside `data-effect={id}`. */
	part(effect: OverlayEffect, name: string): Element;
	chat(cursor: AgentCursor, text: string, ms?: number): void;
	regions: Map<string, RegionEffect>;
};

export type StepWork = (cursor: AgentCursor, step: Step, run: Run) => Promise<void>;

export type Assist = {
	kind: AssistKind;
	/** A built element inside the work window. */
	el: Styled;
	/** `measure`: the next built element, which the tape spans to. */
	to: Styled | null;
	/** `pair`: the running step this agent joins; the work returns once its status is "done". */
	joins: Step | null;
};

export type AssistWork = (cursor: AgentCursor, assist: Assist, run: Run) => Promise<void>;

/** Kinds without a work function finish at once. */
type Options = {
	clock?: Clock;
	work?: Partial<Record<StepKind, StepWork>>;
	assists?: Partial<Record<AssistKind, AssistWork>>;
};

type Token = { isCancelled: boolean };

type Tween = {
	start: number;
	duration: number;
	fn: (t: number, p: number) => void;
	ease: (p: number) => number;
	resolve: () => void;
};

const defaultClock: Clock = {
	now: () => performance.now(),
	setTimeout: (fn, ms) => setTimeout(fn, ms),
	clearTimeout: (id) => clearTimeout(id),
	requestAnimationFrame: (callback) => requestAnimationFrame(callback),
	cancelAnimationFrame: (id) => cancelAnimationFrame(id)
};

function ancestorIn(node: Element, set: Set<Element>): Element | null {
	for (let el = node.parentElement; el; el = el.parentElement) if (set.has(el)) return el;
	return null;
}

function inDomOrder<T>(entries: [Element, T][]): T[] {
	return entries
		.sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
		.map(([, value]) => value);
}

export class AboutBuild {
	phase = $state<"idle" | "building" | "done">("idle");
	joined = $state(0);
	stepsDone = $state(0);
	elapsedMs = $state(0);
	isFollowing = $state(true);
	cursors = $state<AgentCursor[]>([]);
	effects = $state<OverlayEffect[]>([]);

	/** Bound by `Overlay`. */
	layer: HTMLElement | undefined;

	#totalSteps = $state(0);
	#outcome = $state<"none" | "built" | "skipped">("none");

	progress = $derived(
		this.phase === "building" ? this.stepsDone / Math.max(1, this.#totalSteps) : 1
	);
	hudLabel = $derived.by(() => {
		if (this.phase === "building") {
			return `${this.joined}/${TEAM.length} agents · ${Math.round(this.progress * 100)}%`;
		}
		if (this.#outcome === "built") {
			return `Built by ${TEAM.length} agents in ${(this.elapsedMs / 1000).toFixed(1)}s`;
		}
		if (this.#outcome === "skipped") return "Skipped the build";
		return `Built by ${TEAM.length} agents`;
	});

	#getRoot: () => HTMLElement | undefined;
	#clock: Clock;
	#work: Partial<Record<StepKind, StepWork>>;
	#assists: Partial<Record<AssistKind, AssistWork>>;
	/** Elements and steps an agent is assisting on right now. */
	#assisted = new Set<object>();
	/** When each element or step may take each assist kind again. */
	#cooldowns = new Map<object, Map<AssistKind, number>>();

	#run: Token | null = null;
	#timers = new Set<TimerId>();
	#rafId: number | null = null;
	#tweens = new Set<Tween>();
	#clockMs = 0;
	#lastNow = 0;
	#pace = 1;
	#catchUp = 1;
	/** Steps done when the hero was reviewed; `null` before. */
	#stepsAtReview: number | null = null;
	/** The base pace eases from `from` to `to` over `FOLLOW_EASE_MS`, starting at `atMs`. */
	#base = { from: 1, to: 1, atMs: 0 };
	#targetRunMs = TARGET_RUN_MS.wide;
	#graph: StepGraph | null = null;
	#unlisten: (() => void) | null = null;
	#nextEffectId = 1;

	#sections = new Map<string, Styled>();
	#targets = new Map<string, Styled>();
	#styled = new Map<Styled, Set<string>>();
	#texts = new Map<Element, TypedText>();
	#readouts = new Map<Element, CountedValue>();
	#pendingTyping = new Set<Element>();
	#pendingItems = new Set<Element>();
	#scroller: HTMLElement | null = null;
	/** Follow-scroll's fixed curve, set when the first section is reviewed. */
	#follow: {
		from: number;
		distance: number;
		speed: number;
		startMs: number;
		durationMs: number;
		isLanded: boolean;
		landedAtMs: number | null;
		/** Share of `distance` scrolled so far. */
		progress: number;
	} | null = null;
	#lastClaimMs = 0;
	/** Open from the start without follow-scroll, and for the rest of the run once a stall lifts it. */
	#isGateOpen = false;

	constructor(getRoot: () => HTMLElement | undefined, options: Options = {}) {
		this.#getRoot = getRoot;
		this.#clock = options.clock ?? defaultClock;
		this.#work = options.work ?? WORK;
		this.#assists = options.assists ?? ASSISTS;
	}

	get isBuilding(): boolean {
		return this.phase === "building";
	}

	shouldAutoplay(): boolean {
		return shouldAutoplay(
			() => sessionStorage,
			() => localStorage,
			(query) => matchMedia(query)
		);
	}

	start(): void {
		this.#teardown();
		const root = this.#root();
		try {
			sessionStorage.setItem(ABOUT_BUILD_KEY, "1");
		} catch {
			// Blocked storage only means the build plays again next visit.
		}

		const isCompact =
			matchMedia("(max-width: 639.98px)").matches || matchMedia("(pointer: coarse)").matches;
		this.#pace = isCompact ? 0.85 : 1;
		this.#targetRunMs = isCompact ? TARGET_RUN_MS.compact : TARGET_RUN_MS.wide;
		this.#catchUp = 1;
		this.#stepsAtReview = null;
		this.#base = { from: 1, to: 1, atMs: 0 };

		const graph = this.#prepare(root);
		document.documentElement.removeAttribute("data-about-build");

		const token: Token = { isCancelled: false };
		this.#run = token;
		this.#clockMs = 0;
		this.#lastNow = this.#clock.now();
		this.#totalSteps = graph.steps.length;
		this.#graph = graph;
		this.#lastClaimMs = 0;
		this.stepsDone = 0;
		this.joined = 0;
		this.elapsedMs = 0;
		this.isFollowing = !isReducedMotion(
			() => localStorage,
			(query) => matchMedia(query)
		);
		this.#isGateOpen = !this.isFollowing;
		this.#outcome = "none";
		this.phase = "building";

		const scroller = scrollerOf(root);
		this.#listen(scroller);
		this.#requestFrame();

		const run = this.#createRun(token, root, scroller, isCompact);
		this.#play(run, graph).catch((error: unknown) => {
			if (this.#run === token) this.#finish("skipped");
			throw error;
		});
	}

	skip(): void {
		this.#finish("skipped");
	}

	replay(): void {
		scrollerOf(this.#root()).scrollTop = 0;
		this.start();
	}

	destroy(): void {
		this.#teardown();
	}

	#root(): HTMLElement {
		const root = this.#getRoot();
		if (!root) throw new Error("AboutBuild ran before its root element mounted");
		return root;
	}

	registerText(node: Element, part: TypedText): () => void {
		this.#texts.set(node, part);
		this.#primeText(node, part);
		return () => this.#texts.delete(node);
	}

	registerReadout(node: Element, part: CountedValue): () => void {
		this.#readouts.set(node, part);
		this.#primeReadout(node, part);
		return () => this.#readouts.delete(node);
	}

	#primeText(node: Element, part: TypedText): void {
		const owner = node.parentElement?.closest('[data-build~="type"]');
		if (owner && this.#pendingTyping.has(owner)) part.count = 0;
	}

	#primeReadout(node: Element, part: CountedValue): void {
		if (ancestorIn(node, this.#pendingItems)) part.value = part.getFrom();
	}

	/** Reads every target, then writes its wireframe state, before the first paint. */
	#prepare(root: HTMLElement): StepGraph {
		const sectionEls = [...root.querySelectorAll<Styled>("[data-build-section]")];
		const targetEls = [...root.querySelectorAll<Styled>("[data-build]")];
		const idOf = (el: Styled) => `target-${targetEls.indexOf(el)}`;

		const targets: BuildTarget[] = targetEls.map((el) => {
			// Selected by [data-build], so the attribute is present.
			const tokens = (el.dataset.build ?? "").split(/\s+/);
			const acts = tokens.flatMap((token) => ACTS.filter((act) => act === token));
			const section = el.closest<Styled>("[data-build-section]");
			if (!section) {
				throw new Error("A [data-build] target sits outside every [data-build-section]");
			}
			const parent = el.parentElement?.closest<Styled>("[data-build]");
			return {
				id: idOf(el),
				sectionId: sectionIdOf(section),
				acts,
				parentId: parent ? idOf(parent) : null,
				isFillable: acts.includes("fill"),
				isTestable: tokens.includes("test"),
				isSecure: tokens.includes("secure")
			};
		});
		const has = (el: Styled, act: Act) => targets[targetEls.indexOf(el)].acts.includes(act);
		const lines = targetEls
			.filter((el) => has(el, "line"))
			.map((el) => {
				const rect = el.getBoundingClientRect();
				return { el, isVertical: rect.height > rect.width };
			});
		const paths = targetEls
			.filter((el) => has(el, "draw"))
			.flatMap((el) => [...el.querySelectorAll<SVGPathElement>("path")])
			.map((path) => ({ path, length: path.getTotalLength() }));

		this.#sections = new Map(sectionEls.map((el) => [sectionIdOf(el), el]));
		this.#targets = new Map(targetEls.map((el) => [idOf(el), el]));
		for (const el of targetEls) {
			el.setAttribute("data-build-state", "pending");
			if (has(el, "size")) this.#setStyle(el, "transform", `scale(${WIREFRAME_SCALE})`);
			if (has(el, "type")) this.#pendingTyping.add(el);
			if (has(el, "pop")) for (const item of popItems(el)) this.#hideItem(item);
			if (has(el, "paint")) {
				for (const span of el.querySelectorAll<Styled>("[data-build-paint]")) {
					this.#setStyle(span, "color", "inherit");
				}
			}
		}
		for (const { el, isVertical } of lines) {
			this.#setStyle(el, "transform-origin", "0 0");
			this.#setStyle(el, "transform", isVertical ? "scaleY(0)" : "scaleX(0)");
		}
		for (const { path, length } of paths) {
			this.#setStyle(path, "stroke-dasharray", `${length}`);
			this.#setStyle(path, "stroke-dashoffset", `${length}`);
		}
		for (const [node, part] of this.#texts) this.#primeText(node, part);
		for (const [node, part] of this.#readouts) this.#primeReadout(node, part);
		return planSteps(targets);
	}

	/** By attribute, not inline style, so the page's focus rule can show a focused item. */
	#hideItem(item: Styled): void {
		this.#pendingItems.add(item);
		item.setAttribute("data-build-hidden", "");
	}

	#setStyle(el: Styled, property: string, value: string): void {
		el.style.setProperty(property, value);
		const properties = this.#styled.get(el) ?? new Set<string>();
		properties.add(property);
		this.#styled.set(el, properties);
	}

	#clearStyle(el: Styled, property: string): void {
		el.style.removeProperty(property);
		if (el.getAttribute("style") === "") el.removeAttribute("style");
		this.#styled.get(el)?.delete(property);
	}

	#createRun(token: Token, root: HTMLElement, scroller: HTMLElement, isCompact: boolean): Run {
		const build = this;
		const box = (el: Element): Box => {
			const rect = el.getBoundingClientRect();
			const origin = root.getBoundingClientRect();
			return {
				x: rect.left - origin.left,
				y: rect.top - origin.top,
				w: rect.width,
				h: rect.height
			};
		};
		return {
			isCompact,
			get pace() {
				return build.#speedUp;
			},
			get cursors() {
				return build.cursors;
			},
			sleep: (ms) => this.#sleep(token, ms),
			tween: (ms, fn, ease = EASE.inOut) => this.#tween(token, ms, fn, ease),
			box,
			view: () => {
				const origin = root.getBoundingClientRect();
				const rect = scroller.getBoundingClientRect();
				const top = Math.max(rect.top, 0);
				return {
					x: rect.left - origin.left,
					y: top - origin.top,
					w: scroller.clientWidth,
					h: scroller.clientHeight
				};
			},
			element: (step) => this.#elementOf(step),
			mark: (el, state) => {
				const marked = state === "framed" ? [el, ...el.querySelectorAll("[data-build]")] : [el];
				for (const target of marked) target.setAttribute("data-build-state", state);
			},
			setStyle: (el, property, value) => this.#setStyle(el, property, value),
			clearStyle: (el, property) => this.#clearStyle(el, property),
			texts: (target) =>
				inDomOrder(
					[...this.#texts].filter(
						([node]) => node.parentElement?.closest('[data-build~="type"]') === target
					)
				),
			popItems,
			reveal: (item) => item.removeAttribute("data-build-hidden"),
			readouts: (item) => inDomOrder([...this.#readouts].filter(([node]) => item.contains(node))),
			add: <E extends OverlayEffect>(effect: Omit<E, "id">): E => {
				this.effects.push({ ...effect, id: this.#nextEffectId++ } as E);
				const added = this.effects[this.effects.length - 1] as E;
				if (added.kind in EFFECT_MS) {
					this.#later(token, EFFECT_MS[added.kind as keyof typeof EFFECT_MS], () =>
						this.#removeEffect(added)
					);
				}
				return added;
			},
			fade: (effect, delayMs = 0) => {
				this.#later(token, delayMs, () => {
					effect.isFading = true;
					this.#later(token, FADE_MS, () => this.#removeEffect(effect));
				});
			},
			part: (effect, name) => {
				const el = this.layer?.querySelector(`[data-effect="${effect.id}"] [data-part="${name}"]`);
				if (!el) throw new Error(`Overlay effect ${effect.kind} has no [data-part="${name}"]`);
				return el;
			},
			chat: (cursor, text, ms = 1500) => {
				if (isCompact) for (const other of this.cursors) other.bubble = null;
				cursor.bubble = text;
				this.#later(token, ms, () => {
					if (cursor.bubble === text) cursor.bubble = null;
				});
			},
			regions: new Map()
		};
	}

	#removeEffect(effect: OverlayEffect): void {
		const index = this.effects.findIndex((candidate) => candidate.id === effect.id);
		if (index >= 0) this.effects.splice(index, 1);
	}

	#elementOf(step: Step): Styled {
		const el =
			step.targetId === null
				? this.#sections.get(step.sectionId)
				: this.#targets.get(step.targetId);
		if (!el) throw new Error(`No element for build step ${step.kind}`);
		return el;
	}

	/** Never resolves once the run is cancelled, so no step code runs after Skip or unmount. */
	#sleep(token: Token, ms: number): Promise<void> {
		return new Promise((resolve) => this.#later(token, (ms * this.#pace) / this.#speedUp, resolve));
	}

	#later(token: Token, ms: number, fn: () => void): void {
		if (token.isCancelled) return;
		const id = this.#clock.setTimeout(() => {
			this.#timers.delete(id);
			fn();
		}, ms);
		this.#timers.add(id);
	}

	#tween(
		token: Token,
		ms: number,
		fn: (t: number, p: number) => void,
		ease: (p: number) => number
	): Promise<void> {
		return new Promise((resolve) => {
			if (token.isCancelled) return;
			this.#tweens.add({
				start: this.#clockMs,
				duration: (ms * this.#pace) / this.#speedUp,
				fn,
				ease,
				resolve
			});
		});
	}

	async #play(run: Run, graph: StepGraph): Promise<void> {
		await Promise.all(TEAM.map((agent, index) => this.#agent(run, graph, agent, index)));
		const sections = [...this.#sections.values()];
		const last = sections[sections.length - 1];
		await gather(this.cursors, run.box(last.querySelector("h2") ?? last), run);
		await leave(this.cursors, run);
		this.#finish("built");
	}

	async #agent(run: Run, graph: StepGraph, agent: BuildAgent, index: number): Promise<void> {
		await run.sleep(agent.joinAt);
		const cursor = new AgentCursor(agent);
		this.cursors.push(cursor);
		this.joined++;
		await enter(cursor, index, run);
		while (graph.steps.some((step) => step.status !== "done") || this.#isHolding()) {
			const step = this.#pick(agent, graph);
			if (!step) {
				const assist = this.#pickAssist(agent, graph);
				if (assist) {
					await this.#runAssist(cursor, assist, run);
					await run.sleep(ASSIST_REST_MS);
				} else {
					cursor.action = "";
					await wander(cursor, run);
				}
				continue;
			}
			step.status = "claimed";
			this.#lastClaimMs = this.#clockMs;
			const el = this.#elementOf(step);
			cursor.focusY = run.box(el).y;
			await this.#work[step.kind]?.(cursor, step, run);
			cursor.focusY = null;
			step.status = "done";
			this.stepsDone++;
			this.#settle(step, el, graph);
		}
		cursor.action = "";
	}

	/** While follow-scroll runs, and for LANDED_HOLD_MS after it lands, agents keep working. */
	#isHolding(): boolean {
		const follow = this.#follow;
		if (!follow || !this.isFollowing) return false;
		return follow.landedAtMs === null || this.#clockMs < follow.landedAtMs + LANDED_HOLD_MS;
	}

	/**
	 * Builds the status bar first, wherever it is, so Skip shows early. Outside the first section,
	 * picks only steps in the work window, highest first, so agents build where the visitor looks.
	 * The gate opens once follow-scroll lands, and for good after a stall once it has stopped.
	 */
	#pick(agent: BuildAgent, graph: StepGraph): Step | undefined {
		if (this.#isGateOpen) return pickStep(agent.roles, graph, statusFirst);
		const isInWindow = this.#workWindow();
		const isLanded = this.#follow?.isLanded === true;
		const step = pickStep(agent.roles, graph, (candidate) => {
			if (candidate.sectionId === STATUS_SECTION) return -Infinity;
			const rect = this.#elementOf(candidate).getBoundingClientRect();
			const isOpen = isLanded || candidate.sectionId === graph.sections[0].id || isInWindow(rect);
			return isOpen ? rect.top : null;
		});
		const isStalled =
			this.#clockMs - this.#lastClaimMs > GATE_STALL_MS &&
			!graph.steps.some((candidate) => candidate.status === "claimed");
		if (step || !isStalled || this.isFollowing) return step;
		this.#isGateOpen = true;
		return pickStep(agent.roles, graph, statusFirst);
	}

	/** Assists go to built elements in the work window, one agent per element or joined step. */
	#pickAssist(agent: BuildAgent, graph: StepGraph): Assist | null {
		const isInWindow = this.#workWindow();
		const unbuilt = new Set(
			graph.steps.filter((step) => step.status !== "done").map((step) => step.targetId)
		);
		const built = [...this.#targets].flatMap(([id, el]) => {
			if (unbuilt.has(id)) return [];
			const rect = el.getBoundingClientRect();
			return isInWindow(rect) ? [{ el, rect }] : [];
		});
		const isFree = (kind: AssistKind, target: object) => {
			const readyAt = this.#cooldowns.get(target)?.get(kind);
			return !this.#assisted.has(target) && (readyAt === undefined || readyAt <= this.#clockMs);
		};
		for (const kind of agent.assists) {
			if (kind === "pair") {
				const joins = graph.steps.find(
					(step) =>
						step.status === "claimed" &&
						PAIRABLE.includes(step.kind) &&
						isFree(kind, step) &&
						isInWindow(this.#elementOf(step).getBoundingClientRect())
				);
				if (joins) return { kind, el: this.#elementOf(joins), to: null, joins };
				continue;
			}
			const index = built.findIndex(
				({ el, rect }, i) =>
					isFree(kind, el) &&
					(kind !== "measure" ||
						(i + 1 < built.length && built[i + 1].rect.top - rect.bottom >= MEASURE_MIN_GAP))
			);
			if (index < 0) continue;
			const to = kind === "measure" ? built[index + 1].el : null;
			return { kind, el: built[index].el, to, joins: null };
		}
		return null;
	}

	async #runAssist(cursor: AgentCursor, assist: Assist, run: Run): Promise<void> {
		const target = assist.joins ?? assist.el;
		this.#assisted.add(target);
		cursor.focusY = run.box(assist.el).y;
		await this.#assists[assist.kind]?.(cursor, assist, run);
		cursor.focusY = null;
		this.#assisted.delete(target);
		const cooldowns = this.#cooldowns.get(target) ?? new Map<AssistKind, number>();
		cooldowns.set(assist.kind, this.#clockMs + ASSIST_COOLDOWN_MS);
		this.#cooldowns.set(target, cooldowns);
	}

	/** The visible area of `<main>` below a small top gap, plus a look-ahead below. */
	#workWindow(): (rect: DOMRect) => boolean {
		const scroller = this.#scroller;
		if (!scroller) return () => true;
		const viewTop = Math.max(scroller.getBoundingClientRect().top, 0);
		const top = viewTop + TOP_GAP;
		const bottom = viewTop + scroller.clientHeight * (1 + LOOK_AHEAD);
		return (rect) => rect.top < bottom && rect.bottom > top;
	}

	#settle(step: Step, el: Styled, graph: StepGraph): void {
		if (step.kind === "type") this.#pendingTyping.delete(el);
		if (step.kind === "pop") {
			for (const item of popItems(el)) {
				this.#pendingItems.delete(item);
				item.removeAttribute("data-build-hidden");
			}
		}
		if (step.kind !== "review") return;
		for (const target of this.#targets.values()) {
			if (target.closest("[data-build-section]") === el) {
				target.setAttribute("data-build-state", "done");
			}
		}
		if (step.sectionId !== graph.sections[0].id) return;
		this.#stepsAtReview = this.stepsDone;
		if (this.#scroller && this.isFollowing) this.#startFollow(this.#scroller);
	}

	#listen(scroller: HTMLElement): void {
		const stopFollowing = () => {
			this.isFollowing = false;
			this.#follow = null;
		};
		const onKey = (event: KeyboardEvent) => {
			if (SCROLL_KEYS.has(event.key)) stopFollowing();
		};
		const onVisibility = () => {
			if (document.visibilityState === "hidden") {
				this.#cancelFrame();
			} else {
				this.#lastNow = this.#clock.now();
				this.#requestFrame();
			}
		};
		const passive = { passive: true };
		scroller.addEventListener("wheel", stopFollowing, passive);
		scroller.addEventListener("touchstart", stopFollowing, passive);
		scroller.addEventListener("pointerdown", stopFollowing, passive);
		scroller.addEventListener("focusin", stopFollowing);
		window.addEventListener("keydown", onKey, passive);
		document.addEventListener("visibilitychange", onVisibility);
		this.#unlisten = () => {
			scroller.removeEventListener("wheel", stopFollowing);
			scroller.removeEventListener("touchstart", stopFollowing);
			scroller.removeEventListener("pointerdown", stopFollowing);
			scroller.removeEventListener("focusin", stopFollowing);
			window.removeEventListener("keydown", onKey);
			document.removeEventListener("visibilitychange", onVisibility);
		};
		this.#scroller = scroller;
	}

	#requestFrame(): void {
		if (this.#rafId !== null || !this.#run || document.visibilityState === "hidden") return;
		this.#rafId = this.#clock.requestAnimationFrame(this.#frame);
	}

	#cancelFrame(): void {
		if (this.#rafId === null) return;
		this.#clock.cancelAnimationFrame(this.#rafId);
		this.#rafId = null;
	}

	#frame = (now: number): void => {
		this.#rafId = null;
		if (!this.#run) return;
		const dt = Math.min(Math.max(now - this.#lastNow, 0), 64);
		this.#clockMs += dt;
		this.#lastNow = now;

		const follow = this.#readFollow();
		this.#readCatchUp(dt);
		this.#readBase();

		for (const tween of [...this.#tweens]) {
			const p = Math.min(1, (this.#clockMs - tween.start) / tween.duration);
			tween.fn(tween.ease(p), p);
			if (p === 1) {
				this.#tweens.delete(tween);
				tween.resolve();
			}
		}
		if (follow) follow.scroller.scrollTop = follow.top;
		this.#requestFrame();
	};

	/**
	 * Fixes the scroll to the bottom once: ease in, a constant speed that lands by the target run
	 * length, ease out. The builders keep up through the catch-up multiplier.
	 */
	#startFollow(scroller: HTMLElement): void {
		const from = scroller.scrollTop;
		const distance = Math.max(scroller.scrollHeight - scroller.clientHeight - from, 0);
		const remainingMs = Math.max(this.#targetRunMs - FOLLOW_TAIL_MS - this.#clockMs, FOLLOW_MIN_MS);
		const speed = Math.min(distance / remainingMs, FOLLOW_MAX_SPEED, distance / FOLLOW_EASE_MS);
		this.#follow = {
			from,
			distance,
			speed,
			startMs: this.#clockMs,
			durationMs: speed > 0 ? distance / speed + FOLLOW_EASE_MS : 0,
			isLanded: false,
			landedAtMs: null,
			progress: 0
		};
	}

	/**
	 * While scrolling, speeds up step and assist timing when some target in the work window has
	 * more steps left than fit before it scrolls out; eases back to 1 once the work fits.
	 */
	#readCatchUp(dt: number): void {
		const scroller = this.#scroller;
		const graph = this.#graph;
		const follow = this.#follow;
		let target = 1;
		if (scroller && graph && follow && !follow.isLanded && this.isFollowing) {
			const isInWindow = this.#workWindow();
			const exit = Math.max(scroller.getBoundingClientRect().top, 0) + TOP_GAP;
			const left = new Map<string, number>();
			for (const step of graph.steps) {
				if (step.status === "done" || step.targetId === null) continue;
				left.set(step.targetId, (left.get(step.targetId) ?? 0) + 1);
			}
			for (const [id, el] of this.#targets) {
				const steps = left.get(id);
				if (steps === undefined) continue;
				const rect = el.getBoundingClientRect();
				if (!isInWindow(rect)) continue;
				const msLeft = Math.max(rect.bottom - exit, 1) / follow.speed;
				target = Math.max(target, (steps * STEP_MS) / msLeft);
			}
		}
		target = Math.min(target, CATCH_UP_MAX);
		this.#catchUp += (target - this.#catchUp) * (1 - Math.exp(-dt / CATCH_UP_SMOOTH_MS));
	}

	/** Moves the base pace up to the tier of the run's progress since the hero's review. */
	#readBase(): void {
		const at = this.#stepsAtReview;
		if (at === null) return;
		const progress = this.#follow
			? this.#follow.progress
			: (this.stepsDone - at) / Math.max(this.#totalSteps - at, 1);
		const tier =
			PACE_TIERS[Math.min(Math.floor(progress * PACE_TIERS.length), PACE_TIERS.length - 1)];
		if (tier <= this.#base.to) return;
		this.#base = { from: this.#basePace, to: tier, atMs: this.#clockMs };
	}

	get #basePace(): number {
		const { from, to, atMs } = this.#base;
		return from + (to - from) * Math.min((this.#clockMs - atMs) / FOLLOW_EASE_MS, 1);
	}

	/** Catch-up stays under the last tier, so this never exceeds it. */
	get #speedUp(): number {
		return Math.max(this.#basePace, this.#catchUp);
	}

	/** Position on the curve; fractional, so slow speeds don't stall on whole pixels. */
	#readFollow(): { scroller: HTMLElement; top: number } | null {
		const scroller = this.#scroller;
		const follow = this.#follow;
		if (!scroller || !follow || follow.isLanded || !this.isFollowing) return null;
		const { from, distance, speed, durationMs } = follow;
		const t = Math.min(this.#clockMs - follow.startMs, durationMs);
		const ease = FOLLOW_EASE_MS;
		let offset: number;
		if (t < ease) offset = (speed * t * t) / (2 * ease);
		else if (t > durationMs - ease)
			offset = distance - (speed * (durationMs - t) ** 2) / (2 * ease);
		else offset = (speed * ease) / 2 + speed * (t - ease);
		if (t === durationMs) {
			follow.isLanded = true;
			follow.landedAtMs = this.#clockMs;
		}
		follow.progress = distance > 0 ? offset / distance : 1;
		return {
			scroller,
			top: Math.min(from + offset, scroller.scrollHeight - scroller.clientHeight)
		};
	}

	#finish(outcome: "built" | "skipped"): void {
		if (outcome === "built") this.elapsedMs = this.#clockMs;
		this.#teardown();
		this.#outcome = outcome;
		this.phase = "done";
	}

	#teardown(): void {
		if (this.#run) this.#run.isCancelled = true;
		this.#run = null;
		for (const id of this.#timers) this.#clock.clearTimeout(id);
		this.#timers.clear();
		this.#cancelFrame();
		this.#tweens.clear();
		this.#unlisten?.();
		this.#unlisten = null;
		this.#scroller = null;
		this.#follow = null;
		this.#graph = null;
		this.#catchUp = 1;
		this.#stepsAtReview = null;
		this.#base = { from: 1, to: 1, atMs: 0 };
		this.#assisted.clear();
		this.#cooldowns.clear();

		for (const el of this.#targets.values()) el.removeAttribute("data-build-state");
		for (const [el, properties] of this.#styled) {
			for (const property of properties) this.#clearStyle(el, property);
		}
		this.#styled.clear();
		this.#targets.clear();
		this.#sections.clear();
		this.#pendingTyping.clear();
		for (const item of this.#pendingItems) item.removeAttribute("data-build-hidden");
		this.#pendingItems.clear();
		for (const part of this.#texts.values()) {
			part.count = null;
			part.caretColor = null;
		}
		for (const part of this.#readouts.values()) part.value = null;
		this.cursors = [];
		this.effects = [];
		document.documentElement.removeAttribute("data-about-build");
	}
}

function statusFirst(step: Step): number {
	return step.sectionId === STATUS_SECTION ? -Infinity : 0;
}

/** `<main>` is the app's scroll container, not the window. */
function scrollerOf(root: HTMLElement): HTMLElement {
	return root.closest("main") ?? document.documentElement;
}

function sectionIdOf(section: Styled): string {
	const id = section.dataset.buildSection;
	if (!id) throw new Error("[data-build-section] needs a name");
	return id;
}

/** A pop target's items: its `[data-build-item]` descendants, else its children. */
function popItems(target: Element): Styled[] {
	const marked = target.querySelectorAll<Styled>("[data-build-item]");
	return marked.length > 0 ? [...marked] : ([...target.children] as Styled[]);
}

const CONTEXT_KEY = Symbol("about-build");

export function setupAboutBuild(getRoot: () => HTMLElement | undefined): AboutBuild {
	const build = new AboutBuild(getRoot);
	setContext(CONTEXT_KEY, build);
	return build;
}

export function getAboutBuild(): AboutBuild {
	const build = getContext<AboutBuild | undefined>(CONTEXT_KEY);
	if (!build) throw new Error("getAboutBuild() was called before setupAboutBuild()");
	return build;
}
