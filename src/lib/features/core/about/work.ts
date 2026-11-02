import { tick } from "svelte";
import type {
	AgentCursor,
	AssistWork,
	BadgeEffect,
	Box,
	CountedValue,
	GuideEffect,
	MarqueeEffect,
	PaintPanelEffect,
	RedlineEffect,
	RegionEffect,
	RippleEffect,
	Run,
	SizePanelEffect,
	StepWork
} from "./build.svelte.js";
import { HANDOFF, type AssistKind, type StepKind } from "./plan.js";

export type ToolName =
	"radius" | "shadow" | "gradient" | "align" | "code" | "layers" | "contrast" | "inspect";

/** A design-tool panel in the overlay. `rows` and `active` mean what each tool needs. */
export type ToolEffect = {
	id: number;
	kind: "tool";
	tool: ToolName;
	color: string;
	x: number;
	y: number;
	t: number;
	value: string;
	rows: string[];
	active: number;
	isFading: boolean;
};

/** Padding bands over a box, like a box-model inspector. Pads are top, right, bottom, left. */
export type BandsEffect = {
	id: number;
	kind: "bands";
	box: Box;
	pads: [number, number, number, number];
	t: number;
	isFading: boolean;
};

export type PinEffect = {
	id: number;
	kind: "pin";
	color: string;
	x: number;
	y: number;
	isResolved: boolean;
	isFading: boolean;
};

/** The scale a `size` target starts from before its font-size slider runs. */
export const WIREFRAME_SCALE = 0.42;

export const EASE = {
	inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
	out: (t: number) => 1 - Math.pow(1 - t, 3),
	/** Overshoots to about 1.1 before settling. */
	back: (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
	linear: (t: number) => t
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function place(cursor: AgentCursor, x: number, y: number): void {
	cursor.x = x;
	cursor.y = y;
}

/** Moves along a slightly bent curve, so cursors don't travel on rails. */
function move(cursor: AgentCursor, x: number, y: number, run: Run, ms?: number): Promise<void> {
	const x0 = cursor.x;
	const y0 = cursor.y;
	const dx = x - x0;
	const dy = y - y0;
	const distance = Math.hypot(dx, dy);
	if (distance < 1) return Promise.resolve();
	const bend = (Math.random() - 0.5) * 0.35;
	const cx = x0 + dx / 2 - dy * bend;
	const cy = y0 + dy / 2 + dx * bend;
	return run.tween(ms ?? clamp(240 + distance * 0.4, 260, 700), (t) => {
		const u = 1 - t;
		place(cursor, u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y);
	});
}

/** A visual press only: a ripple in the overlay, never an event on the page. */
function press(cursor: AgentCursor, run: Run): void {
	run.add<RippleEffect>({ kind: "ripple", color: cursor.agent.color, x: cursor.x, y: cursor.y });
}

function badge(x: number, y: number, run: Run): void {
	run.fade(run.add<BadgeEffect>({ kind: "badge", x, y, isFading: false }), 1100);
}

function guides(box: Box, color: string, run: Run): void {
	if (run.isCompact) return;
	const lines = [
		["h", box.y],
		["h", box.y + box.h],
		["v", box.x],
		["v", box.x + box.w]
	] as const;
	for (const [axis, at] of lines) run.add<GuideEffect>({ kind: "guide", color, axis, at });
}

/** Measures the gap to the previous visible sibling, like a redline spec. */
function redline(el: Element, box: Box, run: Run): void {
	if (run.isCompact) return;
	let previous = el.previousElementSibling;
	while (
		previous &&
		(previous.getAttribute("aria-hidden") === "true" ||
			previous.getBoundingClientRect().height === 0)
	) {
		previous = previous.previousElementSibling;
	}
	if (!previous) return;
	const above = run.box(previous);
	const gap = Math.round(box.y - (above.y + above.h));
	if (gap < 6 || gap > 200) return;
	run.add<RedlineEffect>({
		kind: "redline",
		x: box.x + Math.min(box.w, above.w) * 0.5,
		y: above.y + above.h,
		gap
	});
}

async function dragBox(cursor: AgentCursor, box: Box, run: Run): Promise<MarqueeEffect> {
	await move(cursor, box.x, box.y, run);
	press(cursor, run);
	const marquee = run.add<MarqueeEffect>({
		kind: "marquee",
		color: cursor.agent.color,
		box,
		t: 0,
		isFading: false
	});
	await run.tween(clamp(280 + (box.w + box.h) * 0.16, 320, 620), (t) => {
		marquee.t = t;
		place(cursor, box.x + box.w * t, box.y + box.h * t);
	});
	guides(box, cursor.agent.color, run);
	return marquee;
}

function count(readout: CountedValue, run: Run): void {
	const from = readout.getFrom();
	const final = readout.getFinal();
	readout.value = from;
	void run
		.tween(
			900,
			(t) => {
				readout.value = from + (final - from) * t;
			},
			EASE.out
		)
		.then(() => {
			readout.value = null;
		});
}

/** Size of an element without its transform, for targets that start scaled to zero. */
function untransformedSize(el: Element, box: Box): { w: number; h: number } {
	return el instanceof HTMLElement ? { w: el.offsetWidth, h: el.offsetHeight } : box;
}

/** Where a panel of about this size fits next to a box: above it if there is room, else below. */
function panelSpot(box: Box, run: Run, width: number, height: number): { x: number; y: number } {
	const view = run.view();
	const scale = run.isCompact ? 0.85 : 1;
	const x = clamp(box.x, view.x + 8, view.x + view.w - width * scale - 8);
	const above = box.y - height * scale - 14;
	return { x, y: above > view.y + 24 ? above : box.y + box.h + 14 };
}

function tool(
	cursor: AgentCursor,
	name: ToolName,
	box: Box,
	run: Run,
	size: [number, number],
	fields: Partial<Pick<ToolEffect, "value" | "rows">> = {}
): ToolEffect {
	return run.add<ToolEffect>({
		kind: "tool",
		tool: name,
		color: cursor.agent.color,
		...panelSpot(box, run, size[0], size[1]),
		t: 0,
		value: fields.value ?? "",
		rows: fields.rows ?? [],
		active: -1,
		isFading: false
	});
}

/** Drags a panel's knob along its track while `fn` applies the value. */
async function slide(
	cursor: AgentCursor,
	panel: ToolEffect,
	run: Run,
	fn: (t: number) => void
): Promise<void> {
	await tick();
	const knob = run.box(run.part(panel, "knob"));
	await move(cursor, knob.x + knob.w / 2, knob.y + knob.h / 2, run);
	press(cursor, run);
	const track = run.box(run.part(panel, "track"));
	await run.tween(900, (t) => {
		panel.t = t;
		fn(t);
		place(cursor, track.x + track.w * t, track.y + 2);
	});
}

function px(value: string): number {
	return Math.round(parseFloat(value) || 0);
}

/** Resolves any CSS color (oklch, color-mix, …) to sRGB channels and alpha by painting it. */
function channels(color: string): [number, number, number, number] {
	const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	if (!context) throw new Error("The contrast check needs a 2D canvas");
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
	return [r, g, b, a / 255];
}

function luminance([r, g, b]: number[]): number {
	const linear = (c: number) => {
		const v = c / 255;
		return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast of an element's text over the first painted background behind it. */
function contrastOf(el: Element): number {
	const ink = channels(getComputedStyle(el).color);
	let paper = channels(getComputedStyle(document.body).backgroundColor);
	for (let node: Element | null = el; node; node = node.parentElement) {
		const background = channels(getComputedStyle(node).backgroundColor);
		if (background[3] > 0.5) {
			paper = background;
			break;
		}
	}
	const blend = (i: number) => ink[i] * ink[3] + paper[i] * (1 - ink[3]);
	const [high, low] = [luminance([0, 1, 2].map(blend)), luminance(paper)].sort((a, b) => b - a);
	return (high + 0.05) / (low + 0.05);
}

/** Short review notes a commenter leaves on finished work. */
const NOTES = [
	"tabular-nums keeps this still",
	"focus ring is visible",
	"no layout shift here",
	"copy reads plain",
	"seat colors from ACCENTS",
	"44px tap target",
	"spacing matches the grid"
];

export const WORK: Record<StepKind, StepWork> = {
	async scan(cursor, step, run) {
		const box = run.box(run.element(step));
		cursor.action = "scoping";
		run.chat(cursor, `scoping ${step.sectionId}`);
		await move(cursor, box.x - 6, box.y - 6, run);
		press(cursor, run);
		const region = run.add<RegionEffect>({
			kind: "region",
			color: cursor.agent.color,
			box: { x: box.x - 6, y: box.y - 6, w: box.w + 12, h: box.h + 12 },
			t: 0,
			label: step.sectionId,
			isOk: false,
			isFading: false
		});
		run.regions.set(step.sectionId, region);
		await run.tween(clamp(500 + box.h * 0.15, 550, 900), (t) => {
			region.t = t;
			place(cursor, box.x - 6 + (box.w + 12) * t, box.y - 6 + (box.h + 12) * t);
		});
		await run.sleep(200);
	},

	async frame(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		if (!box.w || !box.h) {
			run.mark(el, "framed");
			return;
		}
		cursor.action = "frame";
		redline(el, box, run);
		const marquee = await dragBox(cursor, box, run);
		run.mark(el, "framed");
		const handoff = step.next && HANDOFF[step.next];
		if (handoff && box.w * box.h > 60000 && Math.random() < 0.6) {
			run.chat(cursor, `framed → @${handoff}`, 1200);
		}
		run.fade(marquee, 200);
		await run.sleep(60);
	},

	async fill(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		cursor.action = "fill";
		await move(cursor, box.x + 18, box.y + 18, run);
		press(cursor, run);
		run.mark(el, "filled");
		await run.sleep(380);
	},

	async type(cursor, step, run) {
		const el = run.element(step);
		const parts = run.texts(el);
		if (parts.length === 0) return;
		cursor.action = "typing";
		const lengths = parts.map((part) => part.text.length);
		const total = lengths.reduce((sum, length) => sum + length, 0);
		const caretBox = () => {
			const caret = el.querySelector("[data-build-caret]");
			return caret ? run.box(caret) : null;
		};
		parts[0].caretColor = cursor.agent.color;
		await tick();
		const start = caretBox();
		if (start) await move(cursor, start.x + 4, start.y + start.h * 0.55, run);
		await run.tween(
			clamp(total * 15, 400, 1150),
			(_, p) => {
				let remaining = Math.floor(p * total);
				let current = parts.length - 1;
				parts.forEach((part, index) => {
					part.count = clamp(remaining, 0, lengths[index]);
					if (current === parts.length - 1 && remaining < lengths[index]) current = index;
					remaining -= lengths[index];
				});
				parts.forEach((part, index) => {
					part.caretColor = index === current ? cursor.agent.color : null;
				});
				const caret = caretBox();
				if (caret) {
					place(
						cursor,
						cursor.x + (caret.x + 4 - cursor.x) * 0.35,
						cursor.y + (caret.y + caret.h * 0.55 - cursor.y) * 0.35
					);
				}
			},
			EASE.linear
		);
		for (const part of parts) {
			part.count = null;
			part.caretColor = null;
		}
	},

	async size(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		const to = Math.round(parseFloat(getComputedStyle(el).fontSize));
		const from = Math.round(to * WIREFRAME_SCALE);
		const panel = run.add<SizePanelEffect>({
			kind: "size",
			color: cursor.agent.color,
			x: box.x,
			y: Math.max(4, box.y - 48),
			t: 0,
			from,
			to,
			isFading: false
		});
		cursor.action = "font-size";
		await tick();
		const knob = run.box(run.part(panel, "knob"));
		await move(cursor, knob.x + knob.w / 2, knob.y + knob.h / 2, run);
		press(cursor, run);
		await run.sleep(150);
		const track = run.box(run.part(panel, "track"));
		await run.tween(1100, (t) => {
			run.setStyle(el, "transform", `scale(${WIREFRAME_SCALE + (1 - WIREFRAME_SCALE) * t})`);
			panel.t = t;
			place(cursor, track.x + track.w * t, track.y + 2);
		});
		run.clearStyle(el, "transform");
		run.fade(panel, 350);
	},

	async paint(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		const panel = run.add<PaintPanelEffect>({
			kind: "paint",
			color: cursor.agent.color,
			x: box.x + 4,
			y: box.y + box.h + 10,
			isFading: false
		});
		cursor.action = "color";
		await tick();
		for (const span of el.querySelectorAll<HTMLElement | SVGElement>("[data-build-paint]")) {
			const swatch = run.box(run.part(panel, `swatch-${span.dataset.buildPaint}`));
			await move(cursor, swatch.x + swatch.w / 2, swatch.y + swatch.h / 2, run, 380);
			press(cursor, run);
			run.clearStyle(span, "color");
			await run.sleep(300);
		}
		run.fade(panel, 250);
	},

	async pop(cursor, step, run) {
		const items = run.popItems(run.element(step));
		cursor.action = "place";
		for (const item of items) {
			const box = run.box(item);
			await move(
				cursor,
				box.x + box.w / 2,
				box.y + box.h / 2,
				run,
				items.length > 1 ? 190 : undefined
			);
			press(cursor, run);
			// On the build clock, so Skip and Replay end it with the rest of the run.
			run.setStyle(item, "opacity", "0");
			run.setStyle(item, "transform", "scale(0.4)");
			run.reveal(item);
			void run
				.tween(
					500,
					(t) => {
						run.setStyle(item, "opacity", `${Math.min(t, 1)}`);
						run.setStyle(item, "transform", `scale(${0.4 + 0.6 * t})`);
					},
					EASE.back
				)
				.then(() => {
					run.clearStyle(item, "opacity");
					run.clearStyle(item, "transform");
				});
			for (const readout of run.readouts(item)) count(readout, run);
		}
		await run.sleep(300);
	},

	async line(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		const size = untransformedSize(el, box);
		const isVertical = size.h > size.w;
		const length = isVertical ? size.h : size.w;
		if (length) {
			cursor.action = "draw";
			await move(cursor, box.x + (isVertical ? 1 : 0), box.y + (isVertical ? 0 : 1), run);
			press(cursor, run);
			await run.tween(clamp(length * 1.3, 700, 1500), (t) => {
				run.setStyle(el, "transform", isVertical ? `scaleY(${t})` : `scaleX(${t})`);
				place(cursor, box.x + (isVertical ? 1 : length * t), box.y + (isVertical ? length * t : 1));
			});
		}
		run.clearStyle(el, "transform");
		run.clearStyle(el, "transform-origin");
	},

	async draw(cursor, step, run) {
		const el = run.element(step);
		const svg =
			el instanceof SVGSVGElement ? el : el instanceof SVGElement ? el.ownerSVGElement : null;
		if (!svg) throw new Error("A draw target must be an <svg> or sit inside one");
		const box = run.box(svg);
		const viewWidth = Number(svg.getAttribute("viewBox")?.split(/[\s,]+/)[2]) || box.w;
		const scale = box.w / viewWidth;
		cursor.action = "draw";
		for (const path of el.querySelectorAll("path")) {
			const length = path.getTotalLength();
			// Sampled once per unit up front, so the tween only writes.
			const samples = Math.max(1, Math.ceil(length));
			const points = Array.from({ length: samples + 1 }, (_, i) =>
				path.getPointAtLength((length * i) / samples)
			);
			await move(cursor, box.x + points[0].x * scale, box.y + points[0].y * scale, run, 200);
			await run.tween(120 + length * 1.1, (t) => {
				run.setStyle(path, "stroke-dashoffset", `${length * (1 - t)}`);
				const point = points[Math.round(t * samples)];
				place(cursor, box.x + point.x * scale, box.y + point.y * scale);
			});
			run.clearStyle(path, "stroke-dasharray");
			run.clearStyle(path, "stroke-dashoffset");
		}
	},

	async check(cursor, step, run) {
		const box = run.box(run.element(step));
		cursor.action = "verify";
		await move(cursor, box.x + box.w - 8, box.y + 8, run);
		press(cursor, run);
		badge(box.x + box.w - 2, box.y + 2, run);
		await run.sleep(200);
	},

	async test(cursor, step, run) {
		const box = run.box(run.element(step));
		cursor.action = "click test";
		await move(cursor, box.x + box.w * 0.6, box.y + box.h * 0.55, run);
		press(cursor, run);
		run.chat(cursor, "clicks fine", 1000);
		await run.sleep(250);
	},

	async secure(cursor, step, run) {
		const box = run.box(run.element(step));
		cursor.action = "audit";
		await move(cursor, box.x + box.w - 30, box.y + box.h / 2, run);
		press(cursor, run);
		run.chat(cursor, "noopener ✓", 1300);
		badge(box.x + box.w - 2, box.y + 2, run);
		await run.sleep(700);
	},

	async radius(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		const to = px(getComputedStyle(el).borderTopLeftRadius);
		cursor.action = "radius";
		await move(cursor, box.x + 2, box.y + 2, run);
		press(cursor, run);
		const panel = tool(cursor, "radius", box, run, [230, 34], { value: "0" });
		run.setStyle(el, "border-radius", "0px");
		await slide(cursor, panel, run, (t) => {
			const radius = Math.round(to * t);
			panel.value = `${radius}`;
			run.setStyle(el, "border-radius", `${radius}px`);
		});
		run.clearStyle(el, "border-radius");
		run.fade(panel, 300);
	},

	async spacing(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		const style = getComputedStyle(el);
		const pads: BandsEffect["pads"] = [
			px(style.paddingTop),
			px(style.paddingRight),
			px(style.paddingBottom),
			px(style.paddingLeft)
		];
		cursor.action = "padding";
		const bands = run.add<BandsEffect>({ kind: "bands", box, pads, t: 0, isFading: false });
		await move(cursor, box.x + box.w / 2, box.y + pads[0], run);
		press(cursor, run);
		await run.tween(
			800,
			(t) => {
				bands.t = t;
				place(cursor, box.x + box.w / 2, box.y + pads[0] * t);
			},
			EASE.out
		);
		await run.sleep(500);
		run.fade(bands, 200);
	},

	async gradient(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		cursor.action = "gradient";
		run.setStyle(el, "--sweep", "0");
		const panel = tool(cursor, "gradient", box, run, [230, 34]);
		await tick();
		for (const index of [0, 1]) {
			const stop = run.box(run.part(panel, `stop-${index}`));
			await move(cursor, stop.x + stop.w / 2, stop.y + stop.h / 2, run, 380);
			press(cursor, run);
			const track = run.box(run.part(panel, "track"));
			await run.tween(600, (t) => {
				panel.t = (index + t) / 2;
				run.setStyle(el, "--sweep", `${panel.t}`);
				const at = index === 0 ? 0.5 - 0.5 * t : 0.5 + 0.5 * t;
				place(cursor, track.x + track.w * at, track.y + 2);
			});
		}
		run.clearStyle(el, "--sweep");
		run.fade(panel, 300);
	},

	async shadow(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		cursor.action = "shadow";
		const panel = tool(cursor, "shadow", box, run, [230, 34], { value: "0" });
		run.setStyle(el, "box-shadow", "none");
		await slide(cursor, panel, run, (t) => {
			panel.value = `${Math.round(24 * t)}`;
			run.setStyle(
				el,
				"box-shadow",
				`0 ${Math.round(10 * t)}px ${Math.round(24 * t)}px -8px rgb(0 0 0 / ${(0.35 * t).toFixed(2)})`
			);
		});
		run.clearStyle(el, "box-shadow");
		run.fade(panel, 300);
	},

	async align(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		cursor.action = "align";
		const panel = tool(cursor, "align", box, run, [120, 34]);
		await tick();
		const button = run.box(run.part(panel, "align-0"));
		await move(cursor, button.x + button.w / 2, button.y + button.h / 2, run);
		press(cursor, run);
		panel.active = 0;
		run.setStyle(el, "transform", "translate(14px, 0)");
		await run.tween(
			380,
			(t) => run.setStyle(el, "transform", `translate(${14 * (1 - t)}px, 0)`),
			EASE.out
		);
		run.clearStyle(el, "transform");
		run.add<GuideEffect>({ kind: "guide", color: cursor.agent.color, axis: "v", at: box.x });
		run.fade(panel, 400);
	},

	async code(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		const snippet = (el instanceof HTMLElement && el.dataset.buildCode) || "";
		const lines = snippet.split("\n");
		cursor.action = "coding";
		const panel = tool(cursor, "code", box, run, [270, 40 + lines.length * 18], {
			rows: lines.map(() => "")
		});
		await tick();
		const editor = run.box(run.part(panel, "editor"));
		await move(cursor, editor.x + 16, editor.y + 12, run);
		const total = snippet.length;
		await run.tween(
			clamp(total * 32, 700, 1800),
			(_, p) => {
				let remaining = Math.floor(p * total);
				panel.rows = lines.map((line) => {
					const typed = line.slice(0, Math.max(0, remaining));
					remaining -= line.length + 1;
					return typed;
				});
				place(cursor, editor.x + 16 + Math.min(220, (p * total * 7) % 220), editor.y + 12);
			},
			EASE.linear
		);
		panel.value = "saved";
		press(cursor, run);
		run.mark(el, "filled");
		badge(box.x + box.w - 2, box.y + 2, run);
		run.fade(panel, 500);
		await run.sleep(300);
	},

	async layers(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		const children = [...el.querySelectorAll<HTMLElement>(":scope > [data-layer]")];
		cursor.action = "layers";
		const panel = tool(cursor, "layers", box, run, [170, 30 + children.length * 26], {
			rows: children.map((child) => child.dataset.layer ?? "")
		});
		await tick();
		for (const [index, child] of children.entries()) {
			const row = run.box(run.part(panel, `row-${index}`));
			await move(cursor, row.x + 24, row.y + row.h / 2, run, 300);
			press(cursor, run);
			panel.active = index;
			run.setStyle(child, "opacity", "1");
			await run.sleep(280);
		}
		run.mark(el, "filled");
		for (const child of children) run.clearStyle(child, "opacity");
		run.fade(panel, 400);
	},

	async contrast(cursor, step, run) {
		const el = run.element(step);
		const box = run.box(el);
		const ratio = contrastOf(el);
		const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "AA large";
		cursor.action = "contrast";
		await move(cursor, box.x + 10, box.y + box.h / 2, run);
		press(cursor, run);
		const panel = tool(cursor, "contrast", box, run, [190, 34], {
			value: `${ratio.toFixed(1)}:1`,
			rows: [level]
		});
		await run.tween(500, (t) => (panel.t = t), EASE.out);
		await run.sleep(700);
		run.fade(panel, 200);
	},

	async review(cursor, step, run) {
		const box = run.box(run.element(step));
		cursor.action = "review";
		await move(cursor, box.x + box.w - 20, box.y - 4, run);
		press(cursor, run);
		run.chat(cursor, "LGTM", 1200);
		const region = run.regions.get(step.sectionId);
		if (region) {
			region.isOk = true;
			run.fade(region, 900);
		}
		badge(box.x + box.w + 4, box.y - 4, run);
		await run.sleep(500);
	}
};

/** Work idle agents do on built elements, so nobody stands around. */
export const ASSISTS: Record<AssistKind, AssistWork> = {
	async measure(cursor, assist, run) {
		if (!assist.to) return;
		const from = run.box(assist.el);
		const to = run.box(assist.to);
		const gap = Math.round(to.y - (from.y + from.h));
		cursor.action = "measure";
		const x = clamp(from.x + from.w * 0.3, from.x + 8, from.x + from.w - 8);
		await move(cursor, x, from.y + from.h, run);
		press(cursor, run);
		run.add<RedlineEffect>({ kind: "redline", x, y: from.y + from.h, gap });
		await run.tween(Math.min(900, 300 + gap * 3), (t) =>
			place(cursor, x, from.y + from.h + gap * t)
		);
		await run.sleep(300);
	},

	async comment(cursor, assist, run) {
		const box = run.box(assist.el);
		cursor.action = "comment";
		const x = box.x + box.w - 14;
		const y = box.y + 10;
		await move(cursor, x, y, run);
		press(cursor, run);
		const pin = run.add<PinEffect>({
			kind: "pin",
			color: cursor.agent.color,
			x,
			y,
			isResolved: false,
			isFading: false
		});
		run.chat(cursor, NOTES[Math.floor(Math.random() * NOTES.length)], 1400);
		await run.sleep(1300);
		pin.isResolved = true;
		run.fade(pin, 700);
		await run.sleep(200);
	},

	async inspect(cursor, assist, run) {
		const box = run.box(assist.el);
		const style = getComputedStyle(assist.el);
		const pads: BandsEffect["pads"] = [
			px(style.paddingTop),
			px(style.paddingRight),
			px(style.paddingBottom),
			px(style.paddingLeft)
		];
		cursor.action = "inspect";
		await move(cursor, box.x + box.w * 0.5, box.y + box.h * 0.5, run);
		const bands = run.add<BandsEffect>({ kind: "bands", box, pads, t: 1, isFading: false });
		const panel = tool(cursor, "inspect", box, run, [190, 80], {
			rows: [
				`${Math.round(box.w)} × ${Math.round(box.h)}`,
				`padding ${pads.join(" ")}`,
				`margin ${[style.marginTop, style.marginRight, style.marginBottom, style.marginLeft].map(px).join(" ")}`
			]
		});
		await run.sleep(1300);
		run.fade(bands);
		run.fade(panel);
	},

	async pair(cursor, assist, run) {
		const box = run.box(assist.el);
		cursor.action = "pairing";
		await move(cursor, box.x + box.w + 12, box.y + box.h / 2, run);
		guides(box, cursor.agent.color, run);
		while (assist.joins && assist.joins.status !== "done") await run.sleep(300);
	}
};

/** Brings a new agent in from alternating sides of the visible area. */
export async function enter(cursor: AgentCursor, index: number, run: Run): Promise<void> {
	const view = run.view();
	const isFromLeft = index % 2 === 0;
	const y = view.y + view.h * (0.25 + Math.random() * 0.4);
	place(cursor, isFromLeft ? view.x - 40 : view.x + view.w + 20, y);
	run.chat(cursor, index === 0 ? "starting the page" : "joining", 1100);
	const x = isFromLeft
		? view.x + 80 + Math.random() * 120
		: view.x + view.w - 200 - Math.random() * 120;
	await move(cursor, x, y + (Math.random() - 0.5) * 80, run, 700);
}

/** An idle agent drifts near where the others are working. */
export async function wander(cursor: AgentCursor, run: Run): Promise<void> {
	const focus = run.cursors.flatMap((other) => (other.focusY === null ? [] : [other.focusY]));
	const y = focus.length ? focus.reduce((sum, value) => sum + value, 0) / focus.length : cursor.y;
	const view = run.view();
	const x = clamp(cursor.x + (Math.random() - 0.5) * 140, view.x + 20, view.x + view.w - 120);
	await move(cursor, x, y + (Math.random() - 0.3) * 120, run, 700);
	await run.sleep(120);
}

/** The team rings the credit heading once the page is built. */
export async function gather(
	cursors: readonly AgentCursor[],
	around: Box,
	run: Run
): Promise<void> {
	for (const cursor of cursors) cursor.action = "";
	run.chat(cursors[0], "shipped", 1500);
	await Promise.all(
		cursors.map((cursor, index) => {
			const angle = (index / cursors.length) * Math.PI * 2;
			return move(
				cursor,
				around.x + around.w / 2 + Math.cos(angle) * (around.w / 2 + 40),
				around.y + around.h / 2 + Math.sin(angle) * 70,
				run,
				900
			);
		})
	);
	await run.sleep(600);
}

export async function leave(cursors: readonly AgentCursor[], run: Run): Promise<void> {
	await Promise.all(
		cursors.map((cursor, index) => {
			const angle = (index / cursors.length) * Math.PI * 2;
			cursor.isLeaving = true;
			return move(
				cursor,
				cursor.x + Math.cos(angle) * 280,
				cursor.y + Math.sin(angle) * 200,
				run,
				800
			);
		})
	);
}
