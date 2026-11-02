import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test, vi } from "vitest";
import { Button } from "./index.js";

const children = createRawSnippet(() => ({ render: () => "<span>Play</span>" }));

describe("Button", () => {
	test("renders its children as an accessible button", () => {
		render(Button, { props: { children } });
		expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
	});

	test("doesn't submit an enclosing form by default", () => {
		render(Button, { props: { children } });
		expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("type", "button");
	});

	test("calls onclick when clicked", async () => {
		const onclick = vi.fn();
		render(Button, { props: { children, onclick } });
		await fireEvent.click(screen.getByRole("button", { name: "Play" }));
		expect(onclick).toHaveBeenCalledOnce();
	});

	test("can be disabled", () => {
		render(Button, { props: { children, disabled: true } });
		expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
	});

	test("renders as a link when given an href", () => {
		render(Button, { props: { children, href: "/tictactoe/ABCD" } });
		expect(screen.getByRole("link", { name: "Play" })).toHaveAttribute("href", "/tictactoe/ABCD");
	});

	test("a disabled link drops its href and is announced as disabled", () => {
		render(Button, { props: { children, href: "/tictactoe/ABCD", disabled: true } });
		const link = screen.getByRole("link", { name: "Play" });
		expect(link).not.toHaveAttribute("href");
		expect(link).toHaveAttribute("aria-disabled", "true");
	});

	test("a disabled link is removed from the tab order", () => {
		render(Button, { props: { children, href: "/tictactoe/ABCD", disabled: true } });
		expect(screen.getByRole("link", { name: "Play" })).toHaveAttribute("tabindex", "-1");
	});
});
