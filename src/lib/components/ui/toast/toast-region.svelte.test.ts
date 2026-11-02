import { fireEvent, render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { describe, expect, test, vi } from "vitest";
import { ToastRegion, Toaster } from "./index.js";

function renderRegion() {
	const toaster = new Toaster();
	render(ToastRegion, { props: { toaster } });
	return toaster;
}

describe("ToastRegion", () => {
	test("renders messages inside a polite live region", () => {
		const toaster = renderRegion();
		flushSync(() => toaster.show("Link copied"));

		expect(screen.getByText("Link copied").closest("[aria-live]")).toHaveAttribute(
			"aria-live",
			"polite"
		);
	});

	test("the live region exists before any toast so the first one is announced", () => {
		const { container } = render(ToastRegion, { props: { toaster: new Toaster() } });
		expect(container.querySelector("[aria-live=polite]")).toBeInTheDocument();
	});

	test("toasts sit in a fixed region and only fade in, so they never move the page", () => {
		const toaster = renderRegion();
		flushSync(() => toaster.show("Link copied"));

		expect(screen.getByText("Link copied").closest("[aria-live]")).toHaveClass("fixed");
		const toast = screen.getByText("Link copied").closest("[data-slot=toast]");
		expect(toast).toHaveClass("fade-in-0");
		expect(toast?.className).not.toMatch(/slide-in|zoom-in/);
	});

	test("the dismiss button dismisses that toast", async () => {
		const toaster = renderRegion();
		const dismiss = vi.spyOn(toaster, "dismiss");
		let id = 0;
		flushSync(() => {
			id = toaster.show("Link copied");
		});

		await fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

		expect(dismiss).toHaveBeenCalledWith(id);
		expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
	});

	test("the error tone gets the destructive style", () => {
		const toaster = renderRegion();
		flushSync(() => toaster.show("Couldn't copy the link", { tone: "error" }));

		expect(screen.getByText("Couldn't copy the link").closest("[data-slot=toast]")).toHaveClass(
			"text-destructive"
		);
	});

	test("the default tone has no destructive style", () => {
		const toaster = renderRegion();
		flushSync(() => toaster.show("Link copied"));

		expect(screen.getByText("Link copied").closest("[data-slot=toast]")).not.toHaveClass(
			"text-destructive"
		);
	});

	test("showing a toast leaves focus where it was", () => {
		const toaster = renderRegion();
		const trigger = document.createElement("button");
		document.body.append(trigger);
		trigger.focus();

		flushSync(() => toaster.show("Link copied"));

		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	test("sits at the bottom edge when no dock is shown", () => {
		const { container } = render(ToastRegion, { props: { toaster: new Toaster() } });
		const region = container.querySelector("[aria-live]");
		expect(region).toHaveClass("bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]", "sm:bottom-6");
		expect(region).not.toHaveClass("bottom-[calc(env(safe-area-inset-bottom)+5rem)]");
	});

	test("clears the dock below sm when one is shown", () => {
		const { container } = render(ToastRegion, {
			props: { toaster: new Toaster(), aboveDock: true }
		});
		const region = container.querySelector("[aria-live]");
		expect(region).toHaveClass("bottom-[calc(env(safe-area-inset-bottom)+5rem)]", "sm:bottom-6");
	});
});
