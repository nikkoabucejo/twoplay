import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test, vi } from "vitest";
import Choices from "./choices.svelte";

const choice = createRawSnippet<[string, { labelId: string; hintId: string }]>((item, ids) => ({
	render: () =>
		`<span><span id="${ids().labelId}">${item()}</span><span id="${ids().hintId}">About ${item()}</span></span>`
}));

function renderChoices(props: { value?: string; disabled?: boolean } = {}) {
	const onValueChange = vi.fn();
	render(Choices<string>, {
		items: ["one", "two", "three"],
		value: props.value ?? "one",
		onValueChange,
		disabled: props.disabled,
		choice,
		"aria-label": "Pick"
	});
	return onValueChange;
}

describe("Choices", () => {
	test("renders a named radiogroup", () => {
		renderChoices();
		expect(screen.getByRole("radiogroup", { name: "Pick" })).toBeInTheDocument();
	});

	test("each radio is named by its label and described by its hint", () => {
		renderChoices();
		expect(screen.getByRole("radio", { name: "two" })).toHaveAccessibleDescription("About two");
	});

	test("only the checked radio is in the tab order", () => {
		renderChoices({ value: "two" });
		expect(screen.getByRole("radio", { name: "two" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "two" })).toHaveAttribute("tabindex", "0");
		expect(screen.getByRole("radio", { name: "one" })).toHaveAttribute("tabindex", "-1");
	});

	test("clicking a radio picks its value", async () => {
		const onValueChange = renderChoices();
		await fireEvent.click(screen.getByRole("radio", { name: "three" }));
		expect(onValueChange).toHaveBeenCalledWith("three");
	});

	test("ArrowLeft from the first radio wraps to the last", async () => {
		const onValueChange = renderChoices();
		await fireEvent.keyDown(screen.getByRole("radio", { name: "one" }), { key: "ArrowLeft" });
		expect(onValueChange).toHaveBeenCalledWith("three");
		expect(screen.getByRole("radio", { name: "three" })).toHaveFocus();
	});

	test("arrow keys do nothing while disabled", async () => {
		const onValueChange = renderChoices({ disabled: true });
		await fireEvent.keyDown(screen.getByRole("radio", { name: "one" }), { key: "ArrowRight" });
		expect(onValueChange).not.toHaveBeenCalled();
	});
});
