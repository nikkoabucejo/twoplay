import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test } from "vitest";
import { Tile } from "./index.js";

function text(content: string) {
	return createRawSnippet(() => ({ render: () => `<span>${content}</span>` }));
}

const required = { icon: text("icon"), title: text("Checkers"), subtitle: text("Round 2") };

describe("Tile", () => {
	test("renders as a list item", () => {
		render(Tile, { props: required });
		expect(screen.getByRole("listitem")).toBeInTheDocument();
	});

	test("shows its icon, title, and subtitle", () => {
		render(Tile, { props: required });
		expect(screen.getByText("icon")).toBeInTheDocument();
		expect(screen.getByText("Checkers")).toBeInTheDocument();
		expect(screen.getByText("Round 2")).toBeInTheDocument();
	});

	test("shows trailing content when given", () => {
		render(Tile, { props: { ...required, trailing: text("Join") } });
		expect(screen.getByText("Join")).toBeInTheDocument();
	});

	test("shows extra content below the header when given", () => {
		render(Tile, { props: { ...required, children: text("Past games") } });
		expect(screen.getByText("Past games")).toBeInTheDocument();
	});

	test("gets the emerald treatment when highlighted", () => {
		render(Tile, { props: { ...required, highlighted: true } });
		expect(screen.getByRole("listitem")).toHaveClass("border-emerald-500/40");
	});
});
