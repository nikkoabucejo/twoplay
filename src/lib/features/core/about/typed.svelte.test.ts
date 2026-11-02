import { render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setupAboutBuild, type AboutBuild } from "./build.svelte.js";
import Typed from "./typed.svelte";

const contexts = vi.hoisted(() => new Map<unknown, unknown>());
const untyped = vi.hoisted(() => {
	const ranges = new Set<Range>();
	const Highlight = function () {
		return ranges;
	};
	Object.assign(globalThis, { Highlight, CSS: { highlights: new Map() } });
	return ranges;
});

vi.mock("svelte", async (importOriginal) => ({
	...(await importOriginal<typeof import("svelte")>()),
	getContext: (key: unknown) => contexts.get(key),
	setContext: (key: unknown, value: unknown) => {
		contexts.set(key, value);
		return value;
	}
}));

let build: AboutBuild;
let heading: HTMLElement;

beforeEach(() => {
	vi.useFakeTimers();
	contexts.clear();
	document.body.innerHTML = `
		<div class="about-root">
			<section data-build-section="credit"><h2 data-build="type"></h2></section>
		</div>`;
	const root = document.querySelector<HTMLElement>(".about-root");
	heading = document.querySelector("h2") as HTMLElement;
	build = setupAboutBuild(() => root ?? undefined);
});

afterEach(() => {
	build.destroy();
	vi.useRealTimers();
});

describe("Typed", () => {
	test("renders plain text outside a build", () => {
		render(Typed, { props: { text: "Made by Nikko Abucejo" }, target: heading });
		expect(heading).toHaveTextContent(/^Made by Nikko Abucejo$/);
		expect(untyped.size).toBe(0);
	});

	test("under build, keeps the full text and hides the untyped rest with a highlight", () => {
		render(Typed, { props: { text: "Made by Nikko Abucejo" }, target: heading });
		build.start();
		flushSync();
		expect(screen.getByRole("heading")).toHaveAccessibleName("Made by Nikko Abucejo");
		expect(heading).toHaveTextContent(/^Made by Nikko Abucejo$/);
		const [range] = untyped;
		expect(range.toString()).toBe("Made by Nikko Abucejo");
	});

	test("returns to plain text when the build ends", () => {
		render(Typed, { props: { text: "Made by Nikko Abucejo" }, target: heading });
		build.start();
		flushSync();
		build.skip();
		flushSync();
		expect(heading).toHaveTextContent(/^Made by Nikko Abucejo$/);
		expect(untyped.size).toBe(0);
	});
});
