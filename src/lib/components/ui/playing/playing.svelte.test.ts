import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import {
	ALICE,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { Playing } from "./index.js";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));

// vi.mock can't stub lottie-web here: concurrent dynamic imports of a manual mock fall through to
// the real module. Instead keep the real one inert: it paints a 1x1 canvas on load, then fetches JSON.
beforeAll(() => {
	const proxyImageContext = { fillStyle: "", fillRect() {} } as unknown as CanvasRenderingContext2D;
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(proxyImageContext);
	vi.stubGlobal(
		"XMLHttpRequest",
		class {
			open() {}
			send() {}
		}
	);
});

beforeEach(() => {
	resetConvex();
});

function showTictactoe(snapshot = roomSnapshot(tictactoeEngine.createInitialState())) {
	setQueryResult(api.models.rooms.index.get, snapshot);
	render(Playing, { props: { code: "ABCD", type: "tictactoe" } });
}

describe("Playing", () => {
	test("names the game and the room code", () => {
		showTictactoe();
		expect(screen.getByText("Tic-Tac-Toe")).toBeInTheDocument();
		expect(screen.getByText("ABCD")).toBeInTheDocument();
	});

	test("links Play to the room's page", () => {
		showTictactoe();
		expect(screen.getByRole("link", { name: "Play" })).toHaveAttribute("href", "/tictactoe/ABCD");
	});

	test("links a checkers room to the checkers page", () => {
		setQueryResult(api.models.rooms.index.get, roomSnapshot(checkersEngine.createInitialState()));
		render(Playing, { props: { code: "WXYZ", type: "checkers" } });
		expect(screen.getByText("Checkers")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Play" })).toHaveAttribute("href", "/checkers/WXYZ");
	});

	test("shows each player by first name", () => {
		showTictactoe();
		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("Bob")).toBeInTheDocument();
	});

	test("shows an empty seat as waiting for an opponent", () => {
		showTictactoe(roomSnapshot(tictactoeEngine.createInitialState(), { players: [ALICE, null] }));
		expect(screen.getByRole("img", { name: "Waiting for opponent" })).toBeInTheDocument();
	});

	test("shows each seat's remaining clock", () => {
		showTictactoe(
			roomSnapshot(tictactoeEngine.createInitialState(), {
				clock: { remaining: [90_000, 45_000], turnedAt: null }
			})
		);
		expect(screen.getByText("1:30")).toBeInTheDocument();
		expect(screen.getByText("0:45")).toBeInTheDocument();
	});

	test("shows the server's message when abandoning fails", async () => {
		showTictactoe();
		mutationFor(api.models.rooms.index.abandon).mockRejectedValueOnce(
			new Error("This room is no longer active")
		);

		await fireEvent.click(screen.getByRole("button", { name: "Abandon" }));

		expect(await screen.findByText("This room is no longer active")).toBeInTheDocument();
	});
});
