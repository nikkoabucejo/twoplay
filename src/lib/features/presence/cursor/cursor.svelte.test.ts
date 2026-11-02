import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import { resetConvex, setQueryResult } from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import Cursor from "./cursor.svelte";
import { CursorPresence } from "./cursor.svelte.js";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));

const NOW = 1_000_000;

function peer(name: string, overrides: { x?: number; y?: number; updatedAt?: number } = {}) {
	return {
		playerId: `player-${name}` as Id<"players">,
		name,
		index: 1,
		x: 0.25,
		y: 0.75,
		updatedAt: NOW,
		...overrides
	};
}

const children = createRawSnippet(() => ({ render: () => "<div>board</div>" }));

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	resetConvex();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("CursorPresence", () => {
	let presence: CursorPresence;

	afterEach(() => {
		presence.dispose();
	});

	test("lists peers who moved recently", () => {
		presence = new CursorPresence(() => "ABCD");
		setQueryResult(api.models.cursors.index.list, [peer("Bob Baker")]);
		expect(presence.peers.map((p) => p.name)).toEqual(["Bob Baker"]);
	});

	test("hides a peer whose last update is over four seconds old", () => {
		presence = new CursorPresence(() => "ABCD");
		setQueryResult(api.models.cursors.index.list, [
			peer("Bob Baker"),
			peer("Cara Cole", { updatedAt: NOW - 5_000 })
		]);
		expect(presence.peers.map((p) => p.name)).toEqual(["Bob Baker"]);
	});

	test("drops a peer once they've gone quiet long enough", () => {
		presence = new CursorPresence(() => "ABCD");
		setQueryResult(api.models.cursors.index.list, [peer("Bob Baker")]);

		vi.advanceTimersByTime(5_000);

		expect(presence.peers).toEqual([]);
	});

	test("has no peers while the cursor list is loading", () => {
		presence = new CursorPresence(() => "ABCD");
		expect(presence.peers).toEqual([]);
	});
});

describe("Cursor", () => {
	function cursorBox(name: string) {
		return screen.getByText(name).closest<HTMLElement>("[style]");
	}

	test("renders the tracked area", () => {
		render(Cursor, { props: { roomCode: "ABCD", colorFor: () => "text-pink-500", children } });
		expect(screen.getByText("board")).toBeInTheDocument();
	});

	test("labels each peer's cursor with their first name", () => {
		setQueryResult(api.models.cursors.index.list, [peer("Bob Baker")]);
		render(Cursor, { props: { roomCode: "ABCD", colorFor: () => "text-pink-500", children } });
		expect(screen.getByText("Bob")).toBeInTheDocument();
	});

	test("colors a peer's cursor by their seat", () => {
		setQueryResult(api.models.cursors.index.list, [peer("Bob Baker")]);
		const colorFor = (index: number) => (index === 1 ? "text-pink-500" : "text-cyan-500");
		render(Cursor, { props: { roomCode: "ABCD", colorFor, children } });
		expect(screen.getByText("Bob")).toHaveClass("text-pink-500");
	});

	test("places a peer's cursor at their shared position", () => {
		setQueryResult(api.models.cursors.index.list, [peer("Bob Baker", { x: 0.25, y: 0.75 })]);
		render(Cursor, { props: { roomCode: "ABCD", colorFor: () => "text-pink-500", children } });
		expect(cursorBox("Bob")?.style.left).toBe("25%");
		expect(cursorBox("Bob")?.style.top).toBe("75%");
	});

	test("mirrors a peer's cursor on a flipped board", () => {
		setQueryResult(api.models.cursors.index.list, [peer("Bob Baker", { x: 0.25, y: 0.75 })]);
		render(Cursor, {
			props: { roomCode: "ABCD", colorFor: () => "text-pink-500", flip: true, children }
		});
		expect(cursorBox("Bob")?.style.left).toBe("75%");
		expect(cursorBox("Bob")?.style.top).toBe("25%");
	});
});
