import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { Beacon } from "./index.js";

describe("Beacon", () => {
	test("is decorative, so hidden from assistive technology", () => {
		const { container } = render(Beacon);
		expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
	});
});
