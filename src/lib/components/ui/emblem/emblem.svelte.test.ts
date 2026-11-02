import { render, screen } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { CheckersIcon } from "$lib/assets/icons/games";
import { Emblem } from "./index.js";

const colors: [string, string] = ["#06b6d4", "#ec4899"];

// Keeps the real lottie-web (behind Sparkle) inert: it paints a 1x1 canvas on load.
beforeAll(() => {
	const proxyImageContext = { fillStyle: "", fillRect() {} } as unknown as CanvasRenderingContext2D;
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(proxyImageContext);
});

describe("Emblem", () => {
	test("is an image named by its label", () => {
		render(Emblem, { props: { icon: CheckersIcon, colors, label: "Checkers" } });
		expect(screen.getByRole("img", { name: "Checkers" })).toBeInTheDocument();
	});

	test("is hidden from assistive technology without a label", () => {
		const { container } = render(Emblem, { props: { icon: CheckersIcon, colors } });
		expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
	});

	test("lights up when selected", () => {
		render(Emblem, { props: { icon: CheckersIcon, colors, label: "Checkers", selected: true } });
		expect(screen.getByRole("img", { name: "Checkers" })).toHaveClass("is-active");
	});

	test("stays unlit by default", () => {
		render(Emblem, { props: { icon: CheckersIcon, colors, label: "Checkers" } });
		expect(screen.getByRole("img", { name: "Checkers" })).not.toHaveClass("is-active");
	});
});
