import { render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setupAboutBuild, type AboutBuild } from "./build.svelte.js";
import Readout from "./readout.svelte";

const contexts = vi.hoisted(() => new Map<unknown, unknown>());

vi.mock("svelte", async (importOriginal) => ({
	...(await importOriginal<typeof import("svelte")>()),
	getContext: (key: unknown) => contexts.get(key),
	setContext: (key: unknown, value: unknown) => {
		contexts.set(key, value);
		return value;
	}
}));

let build: AboutBuild;
let item: HTMLElement;

beforeEach(() => {
	vi.useFakeTimers();
	contexts.clear();
	document.body.innerHTML = `
		<div class="about-root">
			<section data-build-section="hero"><ul data-build="pop"><li></li></ul></section>
		</div>`;
	const root = document.querySelector<HTMLElement>(".about-root");
	item = document.querySelector("li") as HTMLElement;
	build = setupAboutBuild(() => root ?? undefined);
});

afterEach(() => {
	build.destroy();
	vi.useRealTimers();
});

const VISIBLE = { ignore: ".invisible, .sr-only" };

describe("Readout", () => {
	test("renders the final value outside a build", () => {
		render(Readout, { props: { value: 860, suffix: "+" }, target: item });
		expect(screen.getByText("860+", VISIBLE)).toBeInTheDocument();
	});

	test("renders the final value of a value that counts down", () => {
		render(Readout, { props: { value: 0, from: 0.1443, decimals: 4 }, target: item });
		expect(screen.getByText("0", VISIBLE)).toBeInTheDocument();
	});

	test("under build, shows the start value in a tabular box sized for the final value", () => {
		const { container } = render(Readout, { props: { value: 860, suffix: "+" }, target: item });
		build.start();
		flushSync();
		const box = container.querySelector("[data-build-readout]");
		expect(box).toHaveClass("tabular-nums");
		expect(screen.getByText("0+", VISIBLE)).toBeInTheDocument();
		expect(box?.querySelector(".invisible")).toHaveTextContent("860+");
		expect(box?.querySelector(".sr-only")).toHaveTextContent("860+");
	});

	test("under build, reserves the start value when it is wider than the final one", () => {
		const { container } = render(Readout, {
			props: { value: 0, from: 0.1443, decimals: 4 },
			target: item
		});
		expect(container.querySelector("[data-build-readout] .invisible")).toHaveTextContent("0.1443");
		build.start();
		flushSync();
		expect(screen.getByText("0.1443", VISIBLE)).toBeInTheDocument();
	});
});
