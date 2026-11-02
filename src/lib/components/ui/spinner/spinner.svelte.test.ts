import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { Spinner } from "./index.js";

describe("Spinner", () => {
	test("renders a spinning icon at the requested size", () => {
		const { container } = render(Spinner, { props: { size: "lg" } });
		const icon = container.querySelector("[data-slot=spinner]");
		expect(icon).toHaveClass("animate-spin", "size-8");
	});

	test("lets a caller's class win over the size default", () => {
		const { container } = render(Spinner, { props: { class: "size-3" } });
		const icon = container.querySelector("[data-slot=spinner]");
		expect(icon).toHaveClass("size-3");
		expect(icon).not.toHaveClass("size-6");
	});
});
