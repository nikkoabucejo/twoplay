import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import { Tabs } from "./index.js";

const items = [
	{ value: "tictactoe", label: "Tic-Tac-Toe" },
	{ value: "checkers", label: "Checkers" },
	{ value: "chess", label: "Chess" }
];

function option(name: string) {
	return screen.getByRole("radio", { name });
}

describe("Tabs", () => {
	test("renders a radiogroup with one radio per item", () => {
		render(Tabs, { props: { items, value: "tictactoe", onValueChange: vi.fn() } });
		expect(screen.getByRole("radiogroup")).toBeInTheDocument();
		expect(screen.getAllByRole("radio").map((radio) => radio.textContent?.trim())).toEqual([
			"Tic-Tac-Toe",
			"Checkers",
			"Chess"
		]);
	});

	test("checks and tab-orders only the selected item", () => {
		render(Tabs, { props: { items, value: "checkers", onValueChange: vi.fn() } });
		expect(option("Checkers")).toHaveAttribute("aria-checked", "true");
		expect(option("Checkers")).toHaveAttribute("tabindex", "0");
		for (const name of ["Tic-Tac-Toe", "Chess"]) {
			expect(option(name)).toHaveAttribute("aria-checked", "false");
			expect(option(name)).toHaveAttribute("tabindex", "-1");
		}
	});

	test("reports the clicked item's value", async () => {
		const onValueChange = vi.fn();
		render(Tabs, { props: { items, value: "tictactoe", onValueChange } });
		await fireEvent.click(option("Checkers"));
		expect(onValueChange).toHaveBeenCalledWith("checkers");
	});

	test("ArrowRight on the last item wraps to the first and focuses it", async () => {
		const onValueChange = vi.fn();
		render(Tabs, { props: { items, value: "chess", onValueChange } });
		option("Chess").focus();
		await fireEvent.keyDown(option("Chess"), { key: "ArrowRight" });
		expect(onValueChange).toHaveBeenCalledWith("tictactoe");
		expect(option("Tic-Tac-Toe")).toHaveFocus();
	});

	test("ArrowDown moves to the next item", async () => {
		const onValueChange = vi.fn();
		render(Tabs, { props: { items, value: "tictactoe", onValueChange } });
		await fireEvent.keyDown(option("Tic-Tac-Toe"), { key: "ArrowDown" });
		expect(onValueChange).toHaveBeenCalledWith("checkers");
		expect(option("Checkers")).toHaveFocus();
	});

	test.each([
		["ArrowLeft", "Checkers", "Tic-Tac-Toe", "tictactoe"],
		["ArrowUp", "Checkers", "Tic-Tac-Toe", "tictactoe"],
		["ArrowLeft", "Tic-Tac-Toe", "Chess", "chess"],
		["Home", "Chess", "Tic-Tac-Toe", "tictactoe"],
		["End", "Tic-Tac-Toe", "Chess", "chess"]
	])("%s from %s selects and focuses %s", async (key, from, to, toValue) => {
		const onValueChange = vi.fn();
		const value = items.find((item) => item.label === from)?.value;
		render(Tabs, { props: { items, value, onValueChange } });
		await fireEvent.keyDown(option(from), { key });
		expect(onValueChange).toHaveBeenCalledWith(toValue);
		expect(option(to)).toHaveFocus();
	});

	test("ignores other keys", async () => {
		const onValueChange = vi.fn();
		render(Tabs, { props: { items, value: "tictactoe", onValueChange } });
		await fireEvent.keyDown(option("Tic-Tac-Toe"), { key: "a" });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	test("disables every item when disabled", () => {
		render(Tabs, { props: { items, value: "tictactoe", onValueChange: vi.fn(), disabled: true } });
		for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
	});

	test("disabled tabs ignore the keys", async () => {
		const onValueChange = vi.fn();
		render(Tabs, { props: { items, value: "tictactoe", onValueChange, disabled: true } });
		for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
			await fireEvent.keyDown(option("Tic-Tac-Toe"), { key });
		}
		expect(onValueChange).not.toHaveBeenCalled();
	});

	test("the group doesn't clip, so the focus ring shows whole on the edge items", () => {
		render(Tabs, { props: { items, value: "tictactoe", onValueChange: vi.fn() } });
		expect(screen.getByRole("radiogroup")).not.toHaveClass("overflow-hidden");
		expect(option("Tic-Tac-Toe")).toHaveClass("first:rounded-l-md");
		expect(option("Chess")).toHaveClass("last:rounded-r-md");
		for (const radio of screen.getAllByRole("radio")) {
			expect(radio).toHaveClass("focus-visible:ring-3", "focus-visible:z-10");
		}
	});
});
