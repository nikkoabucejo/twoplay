import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import Preview from "./preview.svelte";

describe("Preview", () => {
	test("chess draws a static, hidden corner of the board with pieces in both seat colors", () => {
		const { container } = render(Preview, { props: { type: "chess" } });
		const preview = container.firstElementChild;
		expect(preview).toHaveAttribute("aria-hidden", "true");
		expect(preview?.querySelectorAll(".text-seat-0").length).toBeGreaterThan(0);
		expect(preview?.querySelectorAll(".text-seat-1").length).toBeGreaterThan(0);
		expect(preview?.querySelector("animate, [class*='animate-']")).toBeNull();
	});
});
