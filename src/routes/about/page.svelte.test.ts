import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import Page from "./+page.svelte";

vi.mock("$app/state", () => ({ page: { url: new URL("https://twoplay.xyz/about") } }));

describe("About page", () => {
	test("has one h1 and the About title", () => {
		render(Page);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(document.title).toBe("About · twoplay");
	});
});
