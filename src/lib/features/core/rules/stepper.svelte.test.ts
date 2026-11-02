import { describe, expect, test } from "vitest";
import { Stepper } from "./stepper.svelte.js";

describe("Stepper", () => {
	test("steps forward and back within its bounds", () => {
		const stepper = new Stepper(3);
		expect(stepper.isFirst).toBe(true);
		stepper.back();
		expect(stepper.index).toBe(0);
		stepper.next();
		stepper.next();
		stepper.next();
		expect(stepper.index).toBe(2);
		expect(stepper.isLast).toBe(true);
	});

	test("go clamps to the steps", () => {
		const stepper = new Stepper(3);
		stepper.go(7);
		expect(stepper.index).toBe(2);
		stepper.go(-1);
		expect(stepper.index).toBe(0);
	});

	test("left and right arrows step, other keys don't", () => {
		const stepper = new Stepper(3);
		expect(stepper.press("ArrowRight")).toBe(true);
		expect(stepper.index).toBe(1);
		expect(stepper.press("ArrowLeft")).toBe(true);
		expect(stepper.index).toBe(0);
		expect(stepper.press("ArrowDown")).toBe(false);
		expect(stepper.index).toBe(0);
	});
});
