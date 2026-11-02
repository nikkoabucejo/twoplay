import { render } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { Sparkle } from "./index.js";

// Keeps the real lottie-web inert: it paints a 1x1 canvas on load.
beforeAll(() => {
	const proxyImageContext = { fillStyle: "", fillRect() {} } as unknown as CanvasRenderingContext2D;
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(proxyImageContext);
});

describe("Sparkle", () => {
	test("is decorative and never intercepts clicks", () => {
		const { container } = render(Sparkle, { props: { colors: ["#06b6d4", "#ec4899"] } });
		const overlay = container.firstElementChild;
		expect(overlay).toHaveAttribute("aria-hidden", "true");
		expect(overlay).toHaveClass("pointer-events-none");
	});
});
