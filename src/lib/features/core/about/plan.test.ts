import { describe, expect, test } from "vitest";
import {
	isReady,
	pickStep,
	planSteps,
	STATUS_SECTION,
	TEAM,
	type Act,
	type BuildTarget,
	type Step,
	type StepGraph,
	type StepKind
} from "./plan.js";

function target(
	overrides: Partial<BuildTarget> & Pick<BuildTarget, "id" | "sectionId">
): BuildTarget {
	return {
		acts: [],
		parentId: null,
		isFillable: false,
		isTestable: false,
		isSecure: false,
		...overrides
	};
}

const TARGETS: BuildTarget[] = [
	target({ id: "hero-copy", sectionId: "hero", acts: ["type"] }),
	target({ id: "hero-board", sectionId: "hero", acts: ["fill"], isFillable: true }),
	target({ id: "hero-lines", sectionId: "hero", acts: ["draw"], parentId: "hero-board" }),
	target({ id: "credit-head", sectionId: "credit", acts: ["type", "size"] }),
	target({ id: "repo", sectionId: "credit", acts: ["pop"], isTestable: true, isSecure: true })
];

/** The hero, the status bar under it, then the credit. */
const WITH_STATUS: BuildTarget[] = [
	...TARGETS.slice(0, 3),
	target({ id: "hud", sectionId: STATUS_SECTION, acts: ["pop"] }),
	...TARGETS.slice(3)
];

function kindsOf(graph: StepGraph, sectionId: string) {
	const section = graph.sections.find((candidate) => candidate.id === sectionId);
	if (!section) throw new Error(`no section ${sectionId}`);
	return [section.scan, ...section.steps, section.review].map((index) => {
		const step = graph.steps[index];
		return step.targetId ? `${step.kind}:${step.targetId}` : step.kind;
	});
}

function finish(graph: StepGraph, kind: string, targetId: string | null) {
	const step = graph.steps.find((step) => step.kind === kind && step.targetId === targetId);
	if (!step) throw new Error(`no ${kind} step for ${targetId}`);
	step.status = "done";
}

function stepOf(graph: StepGraph, kind: string, id: string) {
	const step = graph.steps.find(
		(step) => step.kind === kind && (step.targetId ?? step.sectionId) === id
	);
	if (!step) throw new Error(`no ${kind} step for ${id}`);
	return step;
}

describe("TEAM", () => {
	test("has nine agents with triage first", () => {
		expect(TEAM).toHaveLength(9);
		expect(TEAM[0].name).toBe("triage");
		expect(TEAM[0].joinAt).toBe(0);
	});

	test("joins about one second apart, in order", () => {
		for (let i = 1; i < TEAM.length; i++) {
			const gap = TEAM[i].joinAt - TEAM[i - 1].joinAt;
			expect(gap).toBeGreaterThanOrEqual(800);
			expect(gap).toBeLessThanOrEqual(1200);
		}
	});
});

describe("planSteps", () => {
	test("plans each tool act as a step, in markup order, that some agent can take", () => {
		const roles: Partial<Record<StepKind, string[]>> = {
			radius: ["designer", "steward"],
			gradient: ["designer", "steward"],
			shadow: ["designer", "steward"],
			spacing: ["steward", "architect"],
			align: ["steward", "architect"],
			code: ["engineer"],
			layers: ["architect"],
			contrast: ["security", "verifier"]
		};
		const acts = Object.keys(roles) as Act[];
		const graph = planSteps([target({ id: "card", sectionId: "hero", acts })]);
		expect(kindsOf(graph, "hero")).toEqual([
			"scan",
			"frame:card",
			...acts.map((act) => `${act}:card`),
			"review"
		]);
		for (const act of acts) {
			const takers = TEAM.filter((agent) => agent.roles.includes(act)).map((agent) => agent.name);
			expect(takers.sort()).toEqual(roles[act]?.sort());
		}
	});

	test("gives each section scan, then its target steps, then review", () => {
		const graph = planSteps(TARGETS);
		expect(graph.sections.map((section) => section.id)).toEqual(["hero", "credit"]);
		expect(kindsOf(graph, "hero")).toEqual([
			"scan",
			"frame:hero-copy",
			"type:hero-copy",
			"frame:hero-board",
			"fill:hero-board",
			"check:hero-board",
			"draw:hero-lines",
			"review"
		]);
	});

	test("does not frame a target nested in a framed parent", () => {
		const graph = planSteps(TARGETS);
		expect(
			graph.steps.some((step) => step.kind === "frame" && step.targetId === "hero-lines")
		).toBe(false);
		expect(stepOf(graph, "draw", "hero-lines").parentFrame).toBe(
			stepOf(graph, "frame", "hero-board").index
		);
	});

	test("adds check to fillable targets, test to testable ones, and secure to the repo link", () => {
		const graph = planSteps(TARGETS);
		expect(kindsOf(graph, "credit")).toEqual([
			"scan",
			"frame:credit-head",
			"type:credit-head",
			"size:credit-head",
			"frame:repo",
			"pop:repo",
			"test:repo",
			"secure:repo",
			"review"
		]);
	});

	test("starts every step open", () => {
		expect(planSteps(TARGETS).steps.every((step) => step.status === "open")).toBe(true);
	});
});

describe("isReady", () => {
	test("opens the first section's scan at once", () => {
		const graph = planSteps(TARGETS);
		expect(isReady(stepOf(graph, "scan", "hero"), graph)).toBe(true);
	});

	test("blocks a section's scan until the previous section has a done frame", () => {
		const graph = planSteps(TARGETS);
		const scan = stepOf(graph, "scan", "credit");
		finish(graph, "scan", null);
		expect(isReady(scan, graph)).toBe(false);
		stepOf(graph, "frame", "hero-copy").status = "done";
		expect(isReady(scan, graph)).toBe(true);
	});

	test("opens the status section's scan at once", () => {
		const graph = planSteps(WITH_STATUS);
		expect(isReady(stepOf(graph, "scan", STATUS_SECTION), graph)).toBe(true);
	});

	test("orders the section after the status section by the section before it", () => {
		const graph = planSteps(WITH_STATUS);
		const scan = stepOf(graph, "scan", "credit");
		finish(graph, "scan", null);
		stepOf(graph, "frame", "hud").status = "done";
		expect(isReady(scan, graph)).toBe(false);
		stepOf(graph, "frame", "hero-copy").status = "done";
		expect(isReady(scan, graph)).toBe(true);
	});

	test("blocks a step until its section is scanned and its predecessor is done", () => {
		const graph = planSteps(TARGETS);
		const type = stepOf(graph, "type", "hero-copy");
		expect(isReady(stepOf(graph, "frame", "hero-copy"), graph)).toBe(false);
		stepOf(graph, "scan", "hero").status = "done";
		expect(isReady(type, graph)).toBe(false);
		stepOf(graph, "frame", "hero-copy").status = "done";
		expect(isReady(type, graph)).toBe(true);
	});

	test("blocks a nested step until its parent's frame is done", () => {
		const graph = planSteps(TARGETS);
		stepOf(graph, "scan", "hero").status = "done";
		const draw = stepOf(graph, "draw", "hero-lines");
		expect(isReady(draw, graph)).toBe(false);
		stepOf(graph, "frame", "hero-board").status = "done";
		expect(isReady(draw, graph)).toBe(true);
	});

	test("blocks review until every section step is done", () => {
		const graph = planSteps(TARGETS);
		const hero = graph.sections[0];
		const review = graph.steps[hero.review];
		graph.steps[hero.scan].status = "done";
		for (const index of hero.steps.slice(0, -1)) graph.steps[index].status = "done";
		expect(isReady(review, graph)).toBe(false);
		graph.steps[hero.steps[hero.steps.length - 1]].status = "done";
		expect(isReady(review, graph)).toBe(true);
	});

	test("never offers a claimed step", () => {
		const graph = planSteps(TARGETS);
		const scan = stepOf(graph, "scan", "hero");
		scan.status = "claimed";
		expect(isReady(scan, graph)).toBe(false);
	});
});

describe("pickStep", () => {
	test("takes the first ready step of the highest-priority role", () => {
		const graph = planSteps(TARGETS);
		stepOf(graph, "scan", "hero").status = "done";
		stepOf(graph, "frame", "hero-copy").status = "done";
		expect(pickStep(["fill", "type", "frame"], graph)).toBe(stepOf(graph, "type", "hero-copy"));
	});

	test("falls back to a lower role when the higher ones have nothing ready", () => {
		const graph = planSteps(TARGETS);
		stepOf(graph, "scan", "hero").status = "done";
		expect(pickStep(["fill", "frame"], graph)).toBe(stepOf(graph, "frame", "hero-copy"));
	});

	test("takes the ready step placed lowest, across roles", () => {
		const graph = planSteps(TARGETS);
		stepOf(graph, "scan", "hero").status = "done";
		stepOf(graph, "frame", "hero-copy").status = "done";
		const board = stepOf(graph, "frame", "hero-board");
		const place = (step: Step) => (step === board ? 10 : 20);
		expect(pickStep(["type", "frame"], graph, place)).toBe(board);
	});

	test("skips steps placed at null", () => {
		const graph = planSteps(TARGETS);
		stepOf(graph, "scan", "hero").status = "done";
		stepOf(graph, "frame", "hero-copy").status = "done";
		const type = stepOf(graph, "type", "hero-copy");
		expect(pickStep(["type"], graph, (step) => (step === type ? null : 0))).toBeUndefined();
	});

	test("returns undefined when no role has a ready step", () => {
		const graph = planSteps(TARGETS);
		expect(pickStep(["review", "secure"], graph)).toBeUndefined();
	});
});
