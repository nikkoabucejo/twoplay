import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import {
	mutationFor,
	resetConvex,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import Cursor from "./cursor.svelte";
import { CursorPresence } from "./cursor.svelte.js";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));

vi.mock("$lib/services/auth", async (importOriginal) => {
	const auth = await importOriginal<typeof import("$lib/services/auth")>();
	const signedIn = new auth.ClerkAuth();
	signedIn.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
	return { ...auth, getClerkAuth: () => signedIn };
});

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

	describe("sending", () => {
		const update = api.models.cursors.index.update;
		const clear = api.models.cursors.index.clear;

		function seatedIn(code: string | null) {
			setQueryResult(api.models.rooms.index.active, code ? { code, type: "tictactoe" } : null);
		}

		test("sends no update for a spectator", () => {
			seatedIn(null);
			presence = new CursorPresence(() => "ABCD");
			presence.move(0.5, 0.5);
			expect(mutationFor(update)).not.toHaveBeenCalled();
		});

		test("sends no update when the viewer's active room is a different one", () => {
			seatedIn("WXYZ");
			presence = new CursorPresence(() => "ABCD");
			presence.move(0.5, 0.5);
			expect(mutationFor(update)).not.toHaveBeenCalled();
		});

		test("sends one update for a viewer seated in the room, whatever the code's case", () => {
			seatedIn("ABCD");
			presence = new CursorPresence(() => "abcd");
			presence.move(0.25, 0.75);
			expect(mutationFor(update)).toHaveBeenCalledExactlyOnceWith({
				code: "abcd",
				x: 0.25,
				y: 0.75
			});
		});

		test("leave sends no clear when nothing was sent", () => {
			seatedIn(null);
			presence = new CursorPresence(() => "ABCD");
			presence.move(0.5, 0.5);
			presence.leave();
			expect(mutationFor(clear)).not.toHaveBeenCalled();
		});

		test("leave sends one clear after an update", () => {
			seatedIn("ABCD");
			presence = new CursorPresence(() => "ABCD");
			presence.move(0.5, 0.5);
			presence.leave();
			presence.leave();
			expect(mutationFor(clear)).toHaveBeenCalledOnce();
		});

		test("dispose sends no clear when nothing was sent", () => {
			seatedIn(null);
			presence = new CursorPresence(() => "ABCD");
			presence.dispose();
			expect(mutationFor(clear)).not.toHaveBeenCalled();
		});

		test("dispose sends one clear after an update", () => {
			seatedIn("ABCD");
			presence = new CursorPresence(() => "ABCD");
			presence.move(0.5, 0.5);
			presence.dispose();
			expect(mutationFor(clear)).toHaveBeenCalledOnce();
		});
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
		expect(cursorBox("Bob")?.style.transform).toBe("translate(25cqw, 75cqh)");
	});

	test("mirrors a peer's cursor on a flipped board", () => {
		setQueryResult(api.models.cursors.index.list, [peer("Bob Baker", { x: 0.25, y: 0.75 })]);
		render(Cursor, {
			props: { roomCode: "ABCD", colorFor: () => "text-pink-500", flip: true, children }
		});
		expect(cursorBox("Bob")?.style.transform).toBe("translate(75cqw, 25cqh)");
	});

	test("moves a peer's cursor with transform only, so it never shifts layout", () => {
		setQueryResult(api.models.cursors.index.list, [peer("Bob Baker")]);
		render(Cursor, { props: { roomCode: "ABCD", colorFor: () => "text-pink-500", children } });
		const box = cursorBox("Bob");
		expect(box?.style.left).toBe("");
		expect(box?.style.top).toBe("");
		expect(box).toHaveClass("top-0", "left-0", "transition-transform");
	});

	test("the tracked area is a size container for the cursor's units", () => {
		render(Cursor, { props: { roomCode: "ABCD", colorFor: () => "text-pink-500", children } });
		expect(screen.getByText("board").parentElement).toHaveClass("[container-type:size]");
	});
});
