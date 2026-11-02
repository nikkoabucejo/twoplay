import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { Skeleton } from "./index.js";

function renderSkeleton(props: { class?: string } = {}) {
	const { container } = render(Skeleton, { props });
	return container.querySelector("[data-slot=skeleton]");
}

describe("Skeleton", () => {
	test("is hidden from assistive technology", () => {
		expect(renderSkeleton()).toHaveAttribute("aria-hidden", "true");
	});

	test("pulses only when motion is allowed", () => {
		const skeleton = renderSkeleton();
		expect(skeleton).toHaveClass("motion-safe:animate-pulse");
		expect(skeleton).not.toHaveClass("animate-pulse");
	});

	test("takes its size from the caller's class", () => {
		expect(renderSkeleton({ class: "h-4 w-24" })).toHaveClass("h-4", "w-24");
	});
});
