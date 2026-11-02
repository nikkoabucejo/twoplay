import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test } from "vitest";
import { EmptyState } from "./index.js";

const action = createRawSnippet(() => ({ render: () => `<a href="/play">Play a game</a>` }));

describe("EmptyState", () => {
	test("renders the title and description", () => {
		render(EmptyState, {
			props: { title: "No games yet", description: "Finished games show up here." }
		});
		expect(screen.getByText("No games yet")).toBeInTheDocument();
		expect(screen.getByText("Finished games show up here.")).toBeInTheDocument();
	});

	test("renders the action when given", () => {
		render(EmptyState, { props: { title: "No games yet", description: "x", action } });
		expect(screen.getByRole("link", { name: "Play a game" })).toHaveAttribute("href", "/play");
	});

	test("renders no action when none is given", () => {
		render(EmptyState, { props: { title: "No games yet", description: "x" } });
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});
