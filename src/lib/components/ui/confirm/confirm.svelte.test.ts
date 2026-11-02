import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import { Confirm } from "./index.js";

function anchorWithButton() {
	const anchor = document.createElement("div");
	const button = document.createElement("button");
	button.textContent = "Resign";
	anchor.append(button);
	document.body.append(anchor);
	onTestFinished(() => anchor.remove());
	return { anchor, button };
}

function renderOpen() {
	const { anchor, button } = anchorWithButton();
	const onConfirm = vi.fn();
	render(Confirm, {
		props: {
			open: true,
			anchor,
			title: "Resign this round?",
			description: "Your opponent wins the round.",
			confirmLabel: "Resign round",
			onConfirm
		}
	});
	return { button, onConfirm };
}

describe("Confirm", () => {
	test("is an alert dialog named by its title and described by its consequence", async () => {
		renderOpen();
		const dialog = await screen.findByRole("alertdialog", { name: "Resign this round?" });
		expect(dialog).toHaveAccessibleDescription("Your opponent wins the round.");
	});

	test("takes focus while open", async () => {
		renderOpen();
		const dialog = await screen.findByRole("alertdialog");
		await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
	});

	test("Escape closes it and returns focus to the anchor's button", async () => {
		const { button, onConfirm } = renderOpen();
		const dialog = await screen.findByRole("alertdialog");
		await fireEvent.keyDown(dialog, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
		await waitFor(() => expect(button).toHaveFocus());
		expect(onConfirm).not.toHaveBeenCalled();
	});

	test("Cancel closes it without confirming", async () => {
		const { button, onConfirm } = renderOpen();
		const dialog = await screen.findByRole("alertdialog");
		await fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
		await waitFor(() => expect(button).toHaveFocus());
		expect(onConfirm).not.toHaveBeenCalled();
	});

	test("the confirm button calls onConfirm once and closes it", async () => {
		const { onConfirm } = renderOpen();
		const dialog = await screen.findByRole("alertdialog");
		await fireEvent.click(within(dialog).getByRole("button", { name: "Resign round" }));
		expect(onConfirm).toHaveBeenCalledOnce();
		await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
	});
});
