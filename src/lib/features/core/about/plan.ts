export type Act =
	| "fill"
	| "type"
	| "size"
	| "paint"
	| "pop"
	| "line"
	| "draw"
	| "radius"
	| "spacing"
	| "gradient"
	| "shadow"
	| "align"
	| "code"
	| "layers"
	| "contrast";
export type StepKind = "scan" | "frame" | Act | "check" | "test" | "secure" | "review";

export const ACTS: readonly Act[] = [
	"fill",
	"type",
	"size",
	"paint",
	"pop",
	"line",
	"draw",
	"radius",
	"spacing",
	"gradient",
	"shadow",
	"align",
	"code",
	"layers",
	"contrast"
];

/** Work an idle agent does on already-built elements; never part of the step graph. */
export type AssistKind = "measure" | "comment" | "inspect" | "pair";

/** Steps long enough that an idle agent may join them as a `pair`. */
export const PAIRABLE: readonly StepKind[] = ["type", "draw", "code", "gradient"];

export type BuildAgent = {
	name: string;
	color: string;
	joinAt: number;
	roles: readonly StepKind[];
	assists: readonly AssistKind[];
};

/** Overlay-only colors; agents never use seat colors. Roles and assists are in priority order. */
export const TEAM: readonly BuildAgent[] = [
	{
		name: "triage",
		color: "#d97706",
		joinAt: 0,
		roles: ["scan", "frame", "type"],
		assists: ["measure", "inspect", "pair"]
	},
	{
		name: "architect",
		color: "#8b5cf6",
		joinAt: 1000,
		roles: ["frame", "layers", "spacing", "align", "type"],
		assists: ["measure", "pair", "inspect"]
	},
	{
		name: "engineer",
		color: "#0891b2",
		joinAt: 2000,
		roles: ["draw", "code", "line", "type", "pop"],
		assists: ["pair", "inspect"]
	},
	{
		name: "designer",
		color: "#db2777",
		joinAt: 3000,
		roles: ["size", "paint", "gradient", "radius", "shadow", "fill", "pop", "draw"],
		assists: ["pair", "inspect"]
	},
	{
		name: "steward",
		color: "#059669",
		joinAt: 4000,
		roles: ["line", "spacing", "align", "radius", "shadow", "gradient", "fill", "frame", "type"],
		assists: ["measure", "pair", "inspect"]
	},
	{
		name: "verifier",
		color: "#2563eb",
		joinAt: 5000,
		roles: ["check", "contrast", "type"],
		assists: ["inspect", "pair"]
	},
	{
		name: "qa",
		color: "#ea580c",
		joinAt: 6000,
		roles: ["test", "pop", "type"],
		assists: ["comment", "pair", "inspect"]
	},
	{
		name: "reviewer",
		color: "#4f46e5",
		joinAt: 7000,
		roles: ["review", "type"],
		assists: ["comment", "pair", "inspect"]
	},
	{
		name: "security",
		color: "#dc2626",
		joinAt: 8000,
		roles: ["secure", "contrast", "check", "fill", "type"],
		assists: ["inspect", "pair"]
	}
];

/** Who a framer mentions when it hands a large frame on. */
export const HANDOFF: Partial<Record<StepKind, string>> = {
	fill: "designer",
	type: "engineer",
	check: "verifier"
};

/** The build bar holding Skip: scanned at once and built ahead of everything else. */
export const STATUS_SECTION = "status";

export type BuildTarget = {
	id: string;
	sectionId: string;
	acts: readonly Act[];
	/** The nearest enclosing target, if any. */
	parentId: string | null;
	isFillable: boolean;
	isTestable: boolean;
	isSecure: boolean;
};

export type Step = {
	index: number;
	kind: StepKind;
	sectionId: string;
	/** `null` for a section's scan and review. */
	targetId: string | null;
	prev: number | null;
	/** The kind of the next step on the same target. */
	next: StepKind | null;
	parentFrame: number | null;
	status: "open" | "claimed" | "done";
};

export type BuildSection = { id: string; scan: number; review: number; steps: number[] };

export type StepGraph = { steps: Step[]; sections: BuildSection[] };

export function planSteps(targets: readonly BuildTarget[]): StepGraph {
	const steps: Step[] = [];
	const sections: BuildSection[] = [];
	const byId = new Map(targets.map((target) => [target.id, target]));
	const frameOf = new Map<string, number>();

	const add = (step: Omit<Step, "index" | "next" | "status">) => {
		const index = steps.length;
		steps.push({ ...step, index, next: null, status: "open" });
		if (step.prev !== null) steps[step.prev].next = step.kind;
		return index;
	};

	const sectionIds = [...new Set(targets.map((target) => target.sectionId))];
	for (const sectionId of sectionIds) {
		const scan = add({ kind: "scan", sectionId, targetId: null, prev: null, parentFrame: null });
		const section: BuildSection = { id: sectionId, scan, review: scan, steps: [] };
		for (const target of targets.filter((candidate) => candidate.sectionId === sectionId)) {
			let parentId = target.parentId;
			while (parentId !== null && !frameOf.has(parentId))
				parentId = byId.get(parentId)?.parentId ?? null;
			const parentFrame = parentId === null ? null : (frameOf.get(parentId) ?? null);

			const kinds: StepKind[] = parentFrame === null ? ["frame", ...target.acts] : [...target.acts];
			if (target.isFillable) kinds.push("check");
			if (target.isTestable) kinds.push("test");
			if (target.isSecure) kinds.push("secure");

			let prev: number | null = null;
			for (const kind of kinds) {
				prev = add({ kind, sectionId, targetId: target.id, prev, parentFrame });
				if (kind === "frame") frameOf.set(target.id, prev);
				section.steps.push(prev);
			}
		}
		section.review = add({
			kind: "review",
			sectionId,
			targetId: null,
			prev: null,
			parentFrame: null
		});
		sections.push(section);
	}
	return { steps, sections };
}

export function isReady(step: Step, graph: StepGraph): boolean {
	if (step.status !== "open") return false;
	const sectionIndex = graph.sections.findIndex((section) => section.id === step.sectionId);
	const section = graph.sections[sectionIndex];
	const isDone = (index: number) => graph.steps[index].status === "done";

	if (step.kind === "scan") {
		if (step.sectionId === STATUS_SECTION) return true;
		const before = graph.sections
			.slice(0, sectionIndex)
			.findLast((section) => section.id !== STATUS_SECTION);
		if (!before) return true;
		const frames = before.steps.filter((index) => graph.steps[index].kind === "frame");
		return frames.length === 0 ? isDone(before.scan) : frames.some(isDone);
	}
	if (!isDone(section.scan)) return false;
	if (step.kind === "review") return section.steps.every(isDone);
	if (step.prev !== null && !isDone(step.prev)) return false;
	if (step.parentFrame !== null && !isDone(step.parentFrame)) return false;
	return true;
}

/**
 * The ready step `place` ranks lowest; ties go to the earlier role, then the earlier step.
 * A `null` place rules a step out.
 */
export function pickStep(
	roles: readonly StepKind[],
	graph: StepGraph,
	place: (step: Step) => number | null = () => 0
): Step | undefined {
	let best: { step: Step; at: number } | undefined;
	for (const kind of roles) {
		for (const step of graph.steps) {
			if (step.kind !== kind || !isReady(step, graph)) continue;
			const at = place(step);
			if (at !== null && (!best || at < best.at)) best = { step, at };
		}
	}
	return best?.step;
}
