import { render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { Emoji } from "./index.js";

const requestedUrls: string[] = [];

// Keeps the real lottie-web inert: it paints a 1x1 canvas on load, then fetches the animation JSON.
beforeAll(() => {
	const proxyImageContext = { fillStyle: "", fillRect() {} } as unknown as CanvasRenderingContext2D;
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(proxyImageContext);
	vi.stubGlobal(
		"XMLHttpRequest",
		class {
			open(_method: string, url: string) {
				requestedUrls.push(url);
			}
			send() {}
		}
	);
});

beforeEach(() => {
	requestedUrls.length = 0;
});

describe("Emoji", () => {
	test("is an image named by its label", () => {
		render(Emoji, { props: { codepoint: "1f525", label: "Fire" } });
		expect(screen.getByRole("img", { name: "Fire" })).toBeInTheDocument();
	});

	test("loads the codepoint's animated Noto emoji", async () => {
		render(Emoji, { props: { codepoint: "1f525", label: "Fire" } });
		await vi.waitFor(() =>
			expect(requestedUrls).toContain(
				"https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/lottie.json"
			)
		);
	});
});
