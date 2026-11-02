import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getToaster, setupToaster, Toaster } from "./toaster.svelte.js";

const contexts = vi.hoisted(() => new Map<unknown, unknown>());

vi.mock("svelte", async (importOriginal) => ({
	...(await importOriginal<typeof import("svelte")>()),
	getContext: (key: unknown) => contexts.get(key),
	setContext: (key: unknown, value: unknown) => {
		contexts.set(key, value);
		return value;
	}
}));

beforeEach(() => {
	contexts.clear();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

function messages(toaster: Toaster) {
	return toaster.items.map((item) => item.message);
}

describe("Toaster", () => {
	test("show returns an id and the toast expires after 3000 ms", () => {
		const toaster = new Toaster();
		const id = toaster.show("Link copied");

		expect(toaster.items).toEqual([{ id, message: "Link copied", tone: "default" }]);
		vi.advanceTimersByTime(2999);
		expect(toaster.items).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(toaster.items).toEqual([]);
	});

	test("show keeps the given tone", () => {
		const toaster = new Toaster();
		toaster.show("Couldn't copy the link", { tone: "error" });

		expect(toaster.items[0].tone).toBe("error");
	});

	test("durationMs overrides the duration", () => {
		const toaster = new Toaster();
		toaster.show("Saved", { durationMs: 500 });

		vi.advanceTimersByTime(499);
		expect(toaster.items).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(toaster.items).toEqual([]);
	});

	test("dismiss removes only that toast and clears its timer", () => {
		const toaster = new Toaster();
		const first = toaster.show("one");
		toaster.show("two");

		toaster.dismiss(first);
		expect(messages(toaster)).toEqual(["two"]);
		expect(vi.getTimerCount()).toBe(1);
	});

	test("a fourth show drops the oldest and clears its timer", () => {
		const toaster = new Toaster();
		for (const message of ["one", "two", "three", "four"]) toaster.show(message);

		expect(messages(toaster)).toEqual(["two", "three", "four"]);
		expect(vi.getTimerCount()).toBe(3);
	});
});

describe("setupToaster", () => {
	test("makes the toaster available to getToaster", () => {
		const toaster = setupToaster();
		expect(getToaster()).toBe(toaster);
	});
});

describe("getToaster", () => {
	test("throws before setupToaster", () => {
		expect(() => getToaster()).toThrow("setupToaster");
	});
});
