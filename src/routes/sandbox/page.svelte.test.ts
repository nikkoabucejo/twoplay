import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import Page from "./+page.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("https://twoplay.xyz/sandbox") } }));

// The sections are tested in sandbox.svelte.test.ts; here they would only slow the page down.
vi.mock("$lib/features/core", () => ({ Sandbox: () => {} }));

describe("Sandbox page", () => {
	test("has one h1 and the Sandbox title", () => {
		render(Page);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(document.title).toBe("Sandbox · twoplay");
	});

	test("is not indexed", () => {
		render(Page);
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			"content",
			"noindex"
		);
	});
});
