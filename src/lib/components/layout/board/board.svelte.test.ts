import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet, type ComponentProps } from "svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { Board, type BoardFooter, type BoardPlayer } from "./index.js";

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

const PLAYERS: [BoardPlayer, BoardPlayer] = [
	{ label: "Alice", emoji: "1f602", accent: "text-cyan-500", score: 3 },
	{ label: "Bob", emoji: "1f525", accent: "text-pink-500", score: 1 }
];

const children = createRawSnippet(() => ({ render: () => "<div>game area</div>" }));

function footer(overrides: Partial<BoardFooter> = {}): BoardFooter {
	return {
		isLive: true,
		round: 2,
		latestRound: 3,
		onResign: vi.fn(),
		onRematch: vi.fn(),
		onAbandon: vi.fn(),
		onPlayAgain: vi.fn(),
		onGoLive: vi.fn(),
		onGoToRound: vi.fn(),
		...overrides
	};
}

function renderBoard(props: Partial<ComponentProps<typeof Board>> = {}) {
	return render(Board, { props: { players: PLAYERS, children, ...props } });
}

async function openMenu(name: string) {
	await fireEvent.keyDown(screen.getByRole("button", { name }), { key: "Enter" });
}

describe("Board", () => {
	test("the game is rendered inside the board area", () => {
		renderBoard();
		expect(screen.getByText("game area")).toBeInTheDocument();
	});

	test("the status bar is hidden without a status", () => {
		renderBoard();
		expect(screen.queryByText("Alice")).not.toBeInTheDocument();
	});

	test("the status bar names both players with their scores", () => {
		renderBoard({ status: { type: "turn", player: 0 } });
		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("Bob")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("1")).toBeInTheDocument();
	});

	test("a player without a score shows no score", () => {
		renderBoard({
			players: [{ label: "Alice", emoji: "1f602" }, PLAYERS[1]],
			status: { type: "turn", player: 0 }
		});
		expect(screen.queryByText("3")).not.toBeInTheDocument();
	});

	test("a turn status reads Turn", () => {
		renderBoard({ status: { type: "turn", player: 1 } });
		expect(screen.getByText("Turn")).toBeInTheDocument();
	});

	test("a win puts Win on the winner's side and Loss on the other", () => {
		renderBoard({ status: { type: "winner", player: 1 } });
		const loss = screen.getByText("Loss");
		const win = screen.getByText("Win");
		expect(loss.compareDocumentPosition(win) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	test("a draw reads Draw", () => {
		renderBoard({ status: { type: "draw" } });
		expect(screen.getByText("Draw")).toBeInTheDocument();
	});

	test("a room short a seat reads Waiting", () => {
		renderBoard({ status: { type: "waiting" } });
		expect(screen.getByText("Waiting")).toBeInTheDocument();
	});

	test("a closed room no longer reads Waiting", () => {
		renderBoard({ status: { type: "waiting", closed: true } });
		expect(screen.queryByText("Waiting")).not.toBeInTheDocument();
	});

	test("each player's emoji has an accessible name", () => {
		renderBoard({ status: { type: "turn", player: 0 } });
		expect(screen.getByRole("img", { name: "Face with tears of joy" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "Fire" })).toBeInTheDocument();
	});

	test("an emoji outside the picker's set falls back to a generic name", () => {
		renderBoard({
			players: [{ label: "Alice", emoji: "1f600" }, PLAYERS[1]],
			status: { type: "turn", player: 0 }
		});
		expect(screen.getByRole("img", { name: "Player emoji" })).toBeInTheDocument();
	});

	test("the viewer can change their own emoji", () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0 });
		expect(screen.getAllByRole("button", { name: "Change your emoji" })).toHaveLength(1);
	});

	test("a spectator can't change either emoji", () => {
		renderBoard({ status: { type: "turn", player: 0 } });
		expect(screen.queryByRole("button", { name: "Change your emoji" })).not.toBeInTheDocument();
	});

	test("picking an emoji sends its codepoint", async () => {
		const onTrashtalk = vi.fn();
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0, onTrashtalk });

		await fireEvent.click(screen.getByRole("button", { name: "Change your emoji" }));
		await fireEvent.click(screen.getByRole("button", { name: "Skull" }));

		expect(onTrashtalk).toHaveBeenCalledWith("1f480");
	});

	test("a disconnected opponent is flagged to a seated viewer", () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0, opponentDisconnected: true });
		expect(screen.getByLabelText("Opponent disconnected")).toBeInTheDocument();
	});

	test("spectators don't see a disconnected flag", () => {
		renderBoard({ status: { type: "turn", player: 0 }, opponentDisconnected: true });
		expect(screen.queryByLabelText("Opponent disconnected")).not.toBeInTheDocument();
	});

	test("clocks read as minutes and seconds", () => {
		renderBoard({ footer: footer(), clock: { remaining: [65_000, 600_000], activeSeat: 0 } });
		expect(screen.getByLabelText("Alice's clock: 1:05 remaining")).toBeInTheDocument();
		expect(screen.getByLabelText("Bob's clock: 10:00 remaining")).toBeInTheDocument();
	});

	test("a partial second rounds up so the clock never shows 0:00 with time left", () => {
		renderBoard({ footer: footer(), clock: { remaining: [400, 60_000], activeSeat: 0 } });
		expect(screen.getByLabelText("Alice's clock: 0:01 remaining")).toBeInTheDocument();
	});

	test("clocks are hidden without a clock", () => {
		renderBoard({ footer: footer() });
		expect(screen.queryByLabelText(/clock/)).not.toBeInTheDocument();
	});

	test("the running clock turns red in its last ten seconds", () => {
		renderBoard({ footer: footer(), clock: { remaining: [9_000, 9_000], activeSeat: 0 } });
		expect(screen.getByLabelText("Alice's clock: 0:09 remaining")).toHaveClass("text-destructive");
	});

	test("a paused clock stays in its player's color even when low", () => {
		renderBoard({ footer: footer(), clock: { remaining: [9_000, 9_000], activeSeat: 0 } });
		const bobClock = screen.getByLabelText("Bob's clock: 0:09 remaining");
		expect(bobClock).toHaveClass("text-pink-500");
		expect(bobClock).not.toHaveClass("text-destructive");
	});

	test("the footer shows which round is displayed", () => {
		renderBoard({ footer: footer() });
		expect(screen.getByText("Round 2 of 3")).toBeInTheDocument();
	});

	test("previous round navigates one round back", async () => {
		const onGoToRound = vi.fn();
		renderBoard({ footer: footer({ onGoToRound }) });
		await fireEvent.click(screen.getByRole("button", { name: "Previous round" }));
		expect(onGoToRound).toHaveBeenCalledWith(1);
	});

	test("next round navigates one round forward", async () => {
		const onGoToRound = vi.fn();
		renderBoard({ footer: footer({ onGoToRound }) });
		await fireEvent.click(screen.getByRole("button", { name: "Next round" }));
		expect(onGoToRound).toHaveBeenCalledWith(3);
	});

	test("previous round is disabled on the first round", () => {
		renderBoard({ footer: footer({ round: 1 }) });
		expect(screen.getByRole("button", { name: "Previous round" })).toBeDisabled();
	});

	test("next round is disabled on the latest round", () => {
		renderBoard({ footer: footer({ round: 3 }) });
		expect(screen.getByRole("button", { name: "Next round" })).toBeDisabled();
	});

	test("a past round offers Go live", async () => {
		const onGoLive = vi.fn();
		renderBoard({ footer: footer({ isLive: false, onGoLive }) });
		await fireEvent.click(screen.getByRole("button", { name: "Go live" }));
		expect(onGoLive).toHaveBeenCalledOnce();
	});

	test("a closed room offers Play again", async () => {
		const onPlayAgain = vi.fn();
		renderBoard({ myIndex: 0, footer: footer({ roomClosed: true, onPlayAgain }) });
		await fireEvent.click(screen.getByRole("button", { name: "Play again" }));
		expect(onPlayAgain).toHaveBeenCalledOnce();
	});

	test("a host waiting for an opponent can abandon directly", async () => {
		const onAbandon = vi.fn();
		renderBoard({
			myIndex: 0,
			status: { type: "waiting" },
			footer: footer({ waitingForOpponent: true, onAbandon })
		});
		await fireEvent.click(screen.getByRole("button", { name: "Abandon" }));
		expect(onAbandon).toHaveBeenCalledOnce();
	});

	test("a spectator can't abandon someone else's waiting room", () => {
		renderBoard({ status: { type: "waiting" }, footer: footer({ waitingForOpponent: true }) });
		expect(screen.getByRole("button", { name: "Abandon" })).toBeDisabled();
	});

	test("resigning from the Resign menu forfeits the round", async () => {
		const onResign = vi.fn();
		renderBoard({ myIndex: 0, status: { type: "turn", player: 0 }, footer: footer({ onResign }) });

		await openMenu("Resign");
		await fireEvent.click(screen.getByRole("menuitem", { name: "Resign" }));

		expect(onResign).toHaveBeenCalledOnce();
	});

	test("the Resign menu also offers abandoning the room", async () => {
		const onAbandon = vi.fn();
		renderBoard({ myIndex: 0, status: { type: "turn", player: 0 }, footer: footer({ onAbandon }) });

		await openMenu("Resign");
		await fireEvent.click(screen.getByRole("menuitem", { name: "Abandon" }));

		expect(onAbandon).toHaveBeenCalledOnce();
	});

	test("a finished round offers a rematch", async () => {
		const onRematch = vi.fn();
		renderBoard({ myIndex: 0, status: { type: "draw" }, footer: footer({ onRematch }) });

		await openMenu("Rematch");
		await fireEvent.click(screen.getByRole("menuitem", { name: "Rematch" }));

		expect(onRematch).toHaveBeenCalledOnce();
	});

	test("a spectator can't resign for a player", () => {
		renderBoard({ status: { type: "turn", player: 0 }, footer: footer() });
		expect(screen.getByRole("button", { name: "Resign" })).toBeDisabled();
	});

	test("a footer error is shown to the viewer", () => {
		renderBoard({ footer: footer({ error: "Time's up" }) });
		expect(screen.getByText("Time's up")).toBeInTheDocument();
	});
});
