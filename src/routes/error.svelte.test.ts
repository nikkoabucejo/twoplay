import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import ErrorPage from "./+error.svelte";

const page = vi.hoisted(() => ({ status: 404, url: new URL("https://twoplay.xyz/nope") }));

vi.mock("$app/state", () => ({ page }));

function renderWith(status: number) {
	page.status = status;
	render(ErrorPage);
}

describe("Error page", () => {
	test("a 404 reads Page not found", () => {
		renderWith(404);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
	});

	test("any other status reads Something went wrong", () => {
		renderWith(500);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Something went wrong");
	});

	test("links to New game and Lobby", () => {
		renderWith(404);
		expect(screen.getByRole("link", { name: "New game" })).toHaveAttribute("href", "/play");
		expect(screen.getByRole("link", { name: "Lobby" })).toHaveAttribute("href", "/lobby");
	});

	test("titles the document with the heading and is not indexed", () => {
		renderWith(404);
		expect(document.title).toBe("Page not found · twoplay");
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			"content",
			"noindex"
		);
	});
});
