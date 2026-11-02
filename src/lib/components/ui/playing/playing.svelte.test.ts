import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
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

async function openConfirmation() {
	await fireEvent.click(screen.getByRole("button", { name: "Abandon" }));
	return screen.findByRole("alertdialog");
}

describe("Playing", () => {
	test("names the game and the room code", () => {
		showTictactoe();
		expect(screen.getByText("Tic-Tac-Toe")).toBeInTheDocument();
		expect(screen.getByText("ABCD")).toBeInTheDocument();
	});

	test("names a checkers room", () => {
		setQueryResult(api.models.rooms.index.get, roomSnapshot(checkersEngine.createInitialState()));
		render(Playing, { props: { code: "WXYZ", type: "checkers" } });
		expect(screen.getByText("Checkers")).toBeInTheDocument();
		expect(screen.getByText("WXYZ")).toBeInTheDocument();
	});

	test("reads a chess room's live round through the chess rules", async () => {
		setQueryResult(api.models.rooms.index.get, roomSnapshot(chessEngine.createInitialState()));
		render(Playing, { props: { code: "WXYZ", type: "chess" } });
		expect(screen.getByText("Chess")).toBeInTheDocument();
		expect(await openConfirmation()).toHaveTextContent(
			"You'll forfeit round 1 to Bob and lose 8 rating points. The room closes."
		);
	});

	test("has no link of its own, since the header's live-game pill opens the room", () => {
		showTictactoe();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	test("shows each player by first name", () => {
		showTictactoe();
		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("Bob")).toBeInTheDocument();
	});

	test("shows an empty seat as waiting for an opponent", () => {
		showTictactoe(roomSnapshot(tictactoeEngine.createInitialState(), { players: [ALICE, null] }));
		expect(screen.getByRole("img", { name: "Waiting for an opponent" })).toBeInTheDocument();
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

	test("Abandon asks for confirmation instead of abandoning", async () => {
		showTictactoe();
		expect(await openConfirmation()).toBeInTheDocument();
		expect(mutationFor(api.models.rooms.index.abandon)).not.toHaveBeenCalled();
	});

	test("the confirmation names the live round, the opponent, and the rating cost", async () => {
		showTictactoe();
		expect(await openConfirmation()).toHaveTextContent(
			"You'll forfeit round 1 to Bob and lose 8 rating points. The room closes."
		);
	});

	test("the confirmation says no one has joined when the second seat is empty", async () => {
		showTictactoe(roomSnapshot(tictactoeEngine.createInitialState(), { players: [ALICE, null] }));
		expect(await openConfirmation()).toHaveTextContent("No one has joined yet. The room closes.");
	});

	test("Cancel closes the confirmation and keeps the room", async () => {
		showTictactoe();
		await fireEvent.click(within(await openConfirmation()).getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
		await waitFor(() => expect(screen.getByRole("button", { name: "Abandon" })).toHaveFocus());
		expect(mutationFor(api.models.rooms.index.abandon)).not.toHaveBeenCalled();
	});

	test("confirming abandons the room once, by its code", async () => {
		showTictactoe();
		await fireEvent.click(
			within(await openConfirmation()).getByRole("button", { name: "Abandon" })
		);
		expect(mutationFor(api.models.rooms.index.abandon)).toHaveBeenCalledExactlyOnceWith({
			code: "ABCD"
		});
	});

	test("shows the server's message when abandoning fails", async () => {
		showTictactoe();
		mutationFor(api.models.rooms.index.abandon).mockRejectedValueOnce(
			new Error("This room is no longer active")
		);

		await fireEvent.click(
			within(await openConfirmation()).getByRole("button", { name: "Abandon" })
		);

		expect(await screen.findByText("This room is no longer active")).toBeInTheDocument();
	});
});
