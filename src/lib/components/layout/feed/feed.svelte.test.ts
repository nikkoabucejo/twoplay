import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test } from "vitest";
import { Feed } from "./index.js";

const children = createRawSnippet(() => ({ render: () => "<ul><li>Room ABCD</li></ul>" }));

describe("Feed", () => {
	test("renders its children", () => {
		render(Feed, { props: { children } });
		expect(screen.getByRole("listitem")).toHaveTextContent("Room ABCD");
	});

	test("scrolls its own content", () => {
		const { container } = render(Feed, { props: { children } });
		expect(container.firstElementChild).toHaveClass("overflow-y-auto");
	});

	test("lets a caller's class override the default width", () => {
		const { container } = render(Feed, { props: { children, class: "max-w-lg" } });
		expect(container.firstElementChild).toHaveClass("max-w-lg");
		expect(container.firstElementChild).not.toHaveClass("max-w-md");
	});
});
