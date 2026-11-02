import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { Beacon } from "./index.js";

describe("Beacon", () => {
	test("is decorative, so hidden from assistive technology", () => {
		const { container } = render(Beacon);
		expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
	});

	test("only pings when motion is allowed", () => {
		const { container } = render(Beacon);
		const ping = container.querySelector("[class*=animate-ping]");
		expect(ping).toHaveClass("motion-safe:animate-ping");
		expect(ping).not.toHaveClass("animate-ping");
	});
});
