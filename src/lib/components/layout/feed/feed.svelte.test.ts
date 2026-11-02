import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Feed } from "./index.js";

const children = createRawSnippet(() => ({ render: () => "<ul><li>Room ABCD</li></ul>" }));

beforeEach(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
});

function stubScroll(element: Element, { scrollHeight = 100, clientHeight = 100, scrollTop = 0 }) {
	Object.defineProperty(element, "scrollHeight", { configurable: true, value: scrollHeight });
	Object.defineProperty(element, "clientHeight", { configurable: true, value: clientHeight });
	Object.defineProperty(element, "scrollTop", { configurable: true, value: scrollTop });
}

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

	test("has no fade when its content fits", async () => {
		const { container } = render(Feed, { props: { children } });
		const feed = container.firstElementChild as HTMLElement;
		stubScroll(feed, { scrollHeight: 100, clientHeight: 100 });
		await fireEvent.scroll(feed);
		expect(feed.className).not.toMatch(/mask-/);
	});

	test("fades only the bottom edge when scrolled to the top with more below", async () => {
		const { container } = render(Feed, { props: { children } });
		const feed = container.firstElementChild as HTMLElement;
		stubScroll(feed, { scrollHeight: 300, clientHeight: 100, scrollTop: 0 });
		await fireEvent.scroll(feed);
		expect(feed).toHaveClass("mask-[linear-gradient(to_top,transparent,black_1.5rem)]");
		expect(feed.className).not.toMatch(/to_bottom/);
	});
});
