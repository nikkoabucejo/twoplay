import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import { Tabs } from "./index.js";

const items = [
	{ value: "tictactoe", label: "Tic-Tac-Toe" },
	{ value: "checkers", label: "Checkers" }
];

describe("Tabs", () => {
	test("renders a tablist with one tab per item", () => {
		render(Tabs, { props: { items, value: "tictactoe", onValueChange: vi.fn() } });
		expect(screen.getByRole("tablist")).toBeInTheDocument();
		expect(screen.getAllByRole("tab").map((tab) => tab.textContent?.trim())).toEqual([
			"Tic-Tac-Toe",
			"Checkers"
		]);
	});

	test("marks only the current value's tab as selected", () => {
		render(Tabs, { props: { items, value: "checkers", onValueChange: vi.fn() } });
		expect(screen.getByRole("tab", { name: "Checkers" })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: "Tic-Tac-Toe" })).toHaveAttribute(
			"aria-selected",
			"false"
		);
	});

	test("reports the clicked tab's value", async () => {
		const onValueChange = vi.fn();
		render(Tabs, { props: { items, value: "tictactoe", onValueChange } });
		await fireEvent.click(screen.getByRole("tab", { name: "Checkers" }));
		expect(onValueChange).toHaveBeenCalledWith("checkers");
	});

	test("disables every tab when disabled", () => {
		render(Tabs, { props: { items, value: "tictactoe", onValueChange: vi.fn(), disabled: true } });
		for (const tab of screen.getAllByRole("tab")) expect(tab).toBeDisabled();
	});
});
