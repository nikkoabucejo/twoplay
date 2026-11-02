import { fireEvent, render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setupAboutBuild, type AboutBuild } from "./build.svelte.js";
import Hud from "./hud.svelte";

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
let root: HTMLElement;

beforeEach(() => {
	vi.useFakeTimers();
	contexts.clear();
	document.body.innerHTML = `
		<main>
			<div class="about-root">
				<div id="hud-slot" data-build-section="status"></div>
				<section data-build-section="credit">
					<h2 data-build="type">Made by Nikko Abucejo</h2>
					<a href="/tour" data-build="pop test">Take the tour</a>
				</section>
			</div>
		</main>`;
	root = document.querySelector(".about-root") as HTMLElement;
	build = setupAboutBuild(() => root);
});

afterEach(() => {
	build.destroy();
	vi.useRealTimers();
});

function renderHud() {
	return render(Hud, { target: document.getElementById("hud-slot") as HTMLElement });
}

describe("Hud", () => {
	test("shows Skip as a button while building", () => {
		renderHud();
		build.start();
		flushSync();
		expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
	});

	test("Skip comes before every page link in tab order", () => {
		renderHud();
		build.start();
		flushSync();
		const focusable = [...root.querySelectorAll("a[href], button")];
		expect(focusable[0]).toBe(screen.getByRole("button", { name: "Skip" }));
		expect(focusable[0]).not.toHaveAttribute("tabindex", "-1");
	});

	test("activating Skip ends the run with the final page and offers Replay", async () => {
		renderHud();
		build.start();
		flushSync();
		await fireEvent.click(screen.getByRole("button", { name: "Skip" }));
		expect(build.phase).toBe("done");
		expect(root.querySelector("[data-build-state]")).toBeNull();
		expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
		expect(screen.getByText("Skipped the build")).toBeInTheDocument();
	});

	test("activating Replay starts a new run", async () => {
		renderHud();
		await fireEvent.click(screen.getByRole("button", { name: "Replay" }));
		expect(build.phase).toBe("building");
		expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
	});

	test("Escape skips a running build", async () => {
		renderHud();
		build.start();
		flushSync();
		await fireEvent.keyDown(window, { key: "Escape" });
		expect(build.phase).toBe("done");
		expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
	});

	test("Escape does nothing once the build is done", async () => {
		renderHud();
		await fireEvent.keyDown(window, { key: "Escape" });
		expect(build.phase).toBe("idle");
	});

	test("Skip names Escape as its shortcut", () => {
		renderHud();
		build.start();
		flushSync();
		expect(screen.getByRole("button", { name: "Skip" })).toHaveAttribute(
			"aria-keyshortcuts",
			"Escape"
		);
	});

	test("is not a live region", () => {
		const { container } = renderHud();
		build.start();
		flushSync();
		expect(container.querySelector("[aria-live], [role='status']")).toBeNull();
	});
});
