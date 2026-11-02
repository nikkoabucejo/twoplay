import { render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PREPAINT_SCRIPT } from "$lib/features/core";
import Page from "./+page.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("https://twoplay.xyz/about") } }));

// A first visit starts the build, which measures the hero board's paths; jsdom has no SVG geometry.
beforeEach(() => {
	Object.defineProperty(SVGElement.prototype, "getTotalLength", {
		configurable: true,
		value: () => 100
	});
});

afterEach(() => {
	Reflect.deleteProperty(SVGElement.prototype, "getTotalLength");
});

describe("About page", () => {
	test("has one h1 and the About title", () => {
		render(Page);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(document.title).toBe("About · twoplay");
	});

	test("puts the pre-paint script in the head", () => {
		render(Page);
		const scripts = [...document.head.querySelectorAll("script")];
		expect(scripts.map((script) => script.outerHTML)).toContain(PREPAINT_SCRIPT);
	});
});
