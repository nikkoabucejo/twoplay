import { render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { Sparkle } from "./index.js";

const lottie = vi.hoisted(() => ({
	goToAndStop: vi.fn(),
	loadAnimation: vi.fn()
}));
vi.mock("lottie-web", () => ({
	default: {
		loadAnimation: (options: unknown) => {
			lottie.loadAnimation(options);
			return { goToAndStop: lottie.goToAndStop, destroy() {} };
		}
	}
}));

afterEach(() => {
	document.documentElement.classList.remove("reduce-motion");
	lottie.loadAnimation.mockClear();
	lottie.goToAndStop.mockClear();
});

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

	test("plays on a loop by default", async () => {
		render(Sparkle, { props: { colors: ["#06b6d4", "#ec4899"] } });
		await waitFor(() => expect(lottie.loadAnimation).toHaveBeenCalled());
		expect(lottie.loadAnimation.mock.calls[0][0]).toMatchObject({ autoplay: true, loop: true });
		expect(lottie.goToAndStop).not.toHaveBeenCalled();
	});

	test("holds a still frame under reduced motion", async () => {
		document.documentElement.classList.add("reduce-motion");
		render(Sparkle, { props: { colors: ["#06b6d4", "#ec4899"] } });
		await waitFor(() => expect(lottie.goToAndStop).toHaveBeenCalled());
		expect(lottie.loadAnimation.mock.calls[0][0]).toMatchObject({ autoplay: false });
	});
});
