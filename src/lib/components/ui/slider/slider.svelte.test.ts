import { render, screen } from "@testing-library/svelte";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { Slider } from "./index.js";

// jsdom has no ResizeObserver, which bits-ui watches the slider with.
beforeAll(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Slider", () => {
	test("names the thumb", () => {
		render(Slider, { props: { type: "single", value: 40, thumbLabel: "Volume" } });
		expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuenow", "40");
	});

	test("places the thumb at its value whatever the measured sizes", () => {
		vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(16);
		render(Slider, { props: { type: "single", value: 100, thumbLabel: "Volume" } });
		expect(screen.getByRole("slider", { name: "Volume" })).toHaveStyle({ left: "100%" });
	});
});
