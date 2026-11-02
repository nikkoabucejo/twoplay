import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import RatingRules from "./rating-rules.svelte";

describe("RatingRules", () => {
	test("explains the start, the step, the floor, draws, and the single rating", () => {
		render(RatingRules);
		const rules = screen.getByRole("region", { name: "How ratings work" });
		expect(rules).toHaveTextContent("Everyone starts at 400.");
		expect(rules).toHaveTextContent(
			"A win adds 8 and a loss takes 8, but a rating never drops below 100."
		);
		expect(rules).toHaveTextContent("A draw changes nothing.");
		expect(rules).toHaveTextContent("One rating covers every game.");
	});
});
