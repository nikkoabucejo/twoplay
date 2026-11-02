import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { createRawSnippet, type ComponentProps } from "svelte";
import { beforeAll, describe, expect, onTestFinished, test, vi } from "vitest";
import { TictactoeIcon } from "$lib/assets/icons/games";
import { MoodPresence } from "$lib/features/presence";
import { BOARD_SIZE, type BoardReplay, type BoardRoom } from "./board.svelte";
import { Board, type BoardFooter, type BoardPlayer, type BoardStatus } from "./index.js";

vi.mock("$lib/components/ui", async (importOriginal) => {
	const ui = await importOriginal<typeof import("$lib/components/ui")>();
	const toaster = new ui.Toaster();
	return { ...ui, getToaster: () => toaster };
});

const context = vi.hoisted(() => ({ mood: undefined as MoodPresence | undefined }));

vi.mock("$lib/features/presence", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/features/presence")>()),
	getMood: () => context.mood
}));

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
		onNewOpponent: vi.fn(),
		onLobby: vi.fn(),
		onGoLive: vi.fn(),
		onGoToRound: vi.fn(),
		...overrides
	};
}

const ROOM: BoardRoom = {
	type: "tictactoe",
	name: "Tic-Tac-Toe",
	code: "ABCD",
	icon: TictactoeIcon
};

function replay(overrides: Partial<BoardReplay> = {}): BoardReplay {
	return {
		isViewingHistory: false,
		moveNumber: 3,
		moveCount: 3,
		canStepBack: true,
		canStepForward: false,
		onFirst: vi.fn(),
		onBack: vi.fn(),
		onForward: vi.fn(),
		onLive: vi.fn(),
		...overrides
	};
}

function renderBoard(props: Partial<ComponentProps<typeof Board>> = {}) {
	return render(Board, { props: { players: PLAYERS, children, ...props } });
}

/** A seat's player strip. */
function strip(seat: 0 | 1): HTMLElement {
	return document.querySelector<HTMLElement>(`[data-slot=strip][data-seat="${seat}"]`)!;
}

function strips(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>("[data-slot=strip]")];
}

/** The game status region; the second status region is the disconnect announcement. */
function gameStatus(): HTMLElement {
	return screen.getAllByRole("status")[0];
}

function controls(): HTMLElement {
	return document.querySelector<HTMLElement>("[data-slot=controls]")!;
}

function moveReadout(): HTMLElement {
	return document.querySelector<HTMLElement>("[data-slot=move]")!;
}

function boardArea(): HTMLElement {
	return screen.getByText("game area").parentElement!;
}

/** The stacked variants of a strip's status line. */
function lineLayers(seat: 0 | 1): Element[] {
	return [...strip(seat).querySelector("[data-slot=strip-line]")!.children];
}

function visibleLayers(seat: 0 | 1): Element[] {
	return lineLayers(seat).filter((layer) => !layer.classList.contains("invisible"));
}

function follows(before: Element, after: Element): boolean {
	return Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/** A mood for the next board to report to, dropped after the test. */
function withMood(): MoodPresence {
	const mood = new MoodPresence();
	context.mood = mood;
	onTestFinished(() => {
		context.mood = undefined;
	});
	return mood;
}

async function openMenu(name: string) {
	await fireEvent.keyDown(screen.getByRole("button", { name }), { key: "Enter" });
}

describe("Board", () => {
	test("the game is rendered inside the board area", () => {
		renderBoard();
		expect(screen.getByText("game area")).toBeInTheDocument();
	});

	test.each([
		[0 as const, "1", "0"],
		[1 as const, "0", "1"],
		[null, "1", "0"]
	])("with myIndex %s, seat %s is above the board and seat %s below", (myIndex, top, bottom) => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex });
		const [upper, lower] = strips();
		expect(strips()).toHaveLength(2);
		expect(upper.dataset.seat).toBe(top);
		expect(lower.dataset.seat).toBe(bottom);
		expect(follows(upper, boardArea())).toBe(true);
		expect(follows(boardArea(), lower)).toBe(true);
	});

	test("the viewer's own strip has the You tag and the emoji picker", () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0 });
		const own = within(strip(0));
		expect(own.getByText("You")).toHaveClass("uppercase");
		expect(own.getByRole("button", { name: "Change your emoji" })).toBeInTheDocument();
	});

	test("the opponent's strip has no You tag and no emoji picker", () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0 });
		const other = within(strip(1));
		expect(other.queryByText("You")).not.toBeInTheDocument();
		expect(other.queryByRole("button", { name: "Change your emoji" })).not.toBeInTheDocument();
	});

	test("a spectator sees no You tag in either strip", () => {
		renderBoard({ status: { type: "turn", player: 0 } });
		expect(screen.queryByText("You")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Change your emoji" })).not.toBeInTheDocument();
	});

	test("each strip shows its seat's default mark in the seat color", () => {
		renderBoard({ status: { type: "turn", player: 0 } });
		expect(within(strip(0)).getByText("●").closest("[data-slot=mark]")).toHaveClass("text-seat-0");
		expect(within(strip(1)).getByText("●").closest("[data-slot=mark]")).toHaveClass("text-seat-1");
	});

	test("a text mark shows in the seat color in a fixed box", () => {
		renderBoard({
			players: [
				{ ...PLAYERS[0], mark: "X" },
				{ ...PLAYERS[1], mark: "O" }
			],
			status: { type: "turn", player: 0 }
		});
		const box = within(strip(0)).getByText("X").closest("[data-slot=mark]");
		expect(box).toHaveClass("size-3.5", "shrink-0", "text-seat-0");
		expect(within(strip(1)).getByText("O").closest("[data-slot=mark]")).toHaveClass("text-seat-1");
	});

	test("a mark icon renders hidden in each strip, with the mark read to screen readers", () => {
		const markIcon = createRawSnippet((seat: () => 0 | 1) => ({
			render: () => `<svg data-icon="${seat()}"></svg>`
		}));
		renderBoard({
			players: [
				{ ...PLAYERS[0], mark: "X" },
				{ ...PLAYERS[1], mark: "O" }
			],
			status: { type: "turn", player: 0 },
			markIcon
		});
		for (const [seat, label] of [
			[0, "X"],
			[1, "O"]
		] as const) {
			const icon = strip(seat).querySelector(`[data-icon="${seat}"]`)!;
			expect(icon.closest("[aria-hidden=true]")).not.toBeNull();
			expect(icon.closest("[data-slot=mark]")).toHaveClass("size-3.5", "shrink-0");
			expect(within(strip(seat)).getByText(label)).toHaveClass("sr-only");
		}
	});

	test("a mark icon without a mark is decorative and replaces the disc", () => {
		const markIcon = createRawSnippet((seat: () => 0 | 1) => ({
			render: () => `<svg data-icon="${seat()}"></svg>`
		}));
		renderBoard({ status: { type: "turn", player: 0 }, markIcon });
		for (const seat of [0, 1] as const) {
			const icon = strip(seat).querySelector(`[data-icon="${seat}"]`)!;
			const box = icon.closest<HTMLElement>("[data-slot=mark]")!;
			expect(icon.closest("[aria-hidden=true]")).not.toBeNull();
			expect(within(box).queryByText("●")).not.toBeInTheDocument();
			expect(box.querySelector(".sr-only")).toBeNull();
		}
	});

	test("a seat's clock sits in its strip in monospace tabular figures", () => {
		renderBoard({
			status: { type: "turn", player: 0 },
			clock: { remaining: [65_000, 600_000], activeSeat: 0 }
		});
		expect(within(strip(0)).getByText("1:05")).toHaveClass("font-mono", "tabular-nums");
		expect(within(strip(1)).getByText("10:00")).toHaveClass("font-mono", "tabular-nums");
	});

	test("the round controls hold no clock and follow the lower strip", () => {
		renderBoard({
			myIndex: 0,
			status: { type: "turn", player: 0 },
			footer: footer(),
			replay: replay(),
			clock: { remaining: [65_000, 600_000], activeSeat: 0 }
		});
		const controls = screen
			.getByRole("button", { name: "Previous move" })
			.closest<HTMLElement>("[data-slot=controls]")!;
		expect(within(controls).queryByText(/clock/)).not.toBeInTheDocument();
		expect(within(controls).queryByText(/Round/)).not.toBeInTheDocument();
		const lower = strip(0);
		expect(follows(lower, controls)).toBe(true);
		expect(follows(controls, screen.getByRole("alert"))).toBe(true);
	});

	test("a player without a score shows no score", () => {
		renderBoard({
			players: [{ label: "Alice", emoji: "1f602" }, PLAYERS[1]],
			status: { type: "turn", player: 1 }
		});
		expect(strip(0)).not.toHaveTextContent(/Score/);
		expect(strip(1)).toHaveTextContent("Score 1");
	});

	test("strips have a fixed height, never wrap, and truncate names", () => {
		renderBoard({ status: { type: "turn", player: 0 } });
		for (const seat of [0, 1] as const) {
			expect(strip(seat)).toHaveClass("h-14", "whitespace-nowrap");
			expect(within(strip(seat)).getByText(PLAYERS[seat].label)).toHaveClass("min-w-0", "truncate");
		}
	});

	test("every status keeps each strip line's elements and shows exactly one variant", async () => {
		const cases: [BoardStatus, string, string][] = [
			[{ type: "turn", player: 0 }, "Your turn", "Score 1"],
			[{ type: "turn", player: 1 }, "Score 3", "To move"],
			[{ type: "winner", player: 1 }, "Lost", "Won"],
			[{ type: "draw" }, "Draw", "Draw"],
			[{ type: "waiting" }, "Score 3", "Waiting"]
		];
		const { rerender } = renderBoard({ status: cases[0][0], myIndex: 0 });
		const counts = [lineLayers(0).length, lineLayers(1).length];

		for (const [status, seat0, seat1] of cases) {
			await rerender({ status });
			expect([lineLayers(0).length, lineLayers(1).length]).toEqual(counts);
			expect(visibleLayers(0)).toHaveLength(1);
			expect(visibleLayers(1)).toHaveLength(1);
			expect(visibleLayers(0)[0]).toHaveTextContent(seat0);
			expect(visibleLayers(1)[0]).toHaveTextContent(seat1);
		}
	});

	test("a closed waiting room leaves seat 1's line blank", () => {
		renderBoard({ status: { type: "waiting", closed: true }, myIndex: 0 });
		expect(visibleLayers(1)).toHaveLength(1);
		expect(visibleLayers(1)[0].textContent?.trim()).toBe("");
	});

	test("passing the turn leaves the strips' boxes as they were", async () => {
		const { rerender } = renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0 });
		const before = strips().map((element) => element.className);

		await rerender({ status: { type: "turn", player: 1 } });

		expect(strips().map((element) => element.className)).toEqual(before);
		expect(visibleLayers(1)[0]).toHaveTextContent("To move");
	});

	test("the status is announced once and the strip labels are hidden from screen readers", () => {
		renderBoard({
			players: [PLAYERS[0], { ...PLAYERS[1], label: "Blair" }],
			status: { type: "turn", player: 1 },
			myIndex: 0
		});
		const [game, disconnect] = screen.getAllByRole("status");
		expect(screen.getAllByRole("status")).toHaveLength(2);
		expect(game).toHaveTextContent("Blair's turn");
		expect(disconnect.textContent?.trim()).toBe("");
		for (const seat of [0, 1] as const) {
			for (const layer of lineLayers(seat)) {
				expect(layer.closest("[aria-hidden=true]")).not.toBeNull();
			}
		}
	});

	test.each([
		[{ type: "draw" as const }, "Draw"],
		[{ type: "waiting" as const }, "Waiting for an opponent"],
		[{ type: "waiting" as const, closed: true }, ""]
	])("status %o reads %j to screen readers", (status, text) => {
		renderBoard({ status });
		expect(gameStatus().textContent?.trim()).toBe(text);
	});

	test("every emoji renders inside a strip", () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0 });
		const emoji = screen.getAllByRole("img");
		expect(emoji.length).toBeGreaterThanOrEqual(2);
		for (const image of emoji) expect(image.closest("[data-slot=strip]")).not.toBeNull();
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

	test("the emoji picker shows only its emoji, in a group named Trash talk", async () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0 });
		await fireEvent.click(screen.getByRole("button", { name: "Change your emoji" }));
		const picker = screen.getByRole("group", { name: "Trash talk" });
		expect(within(picker).getAllByRole("button")).toHaveLength(10);
		expect(screen.queryByText("Trash talk")).not.toBeInTheDocument();
	});

	test("Left and Right move between the picker's emoji, wrapping at the ends", async () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0 });
		await fireEvent.click(screen.getByRole("button", { name: "Change your emoji" }));
		const options = within(screen.getByRole("group", { name: "Trash talk" })).getAllByRole(
			"button"
		);

		options[0].focus();
		await fireEvent.keyDown(options[0], { key: "ArrowRight" });
		expect(options[1]).toHaveFocus();
		await fireEvent.keyDown(options[1], { key: "ArrowLeft" });
		await fireEvent.keyDown(options[0], { key: "ArrowLeft" });
		expect(options[9]).toHaveFocus();
		await fireEvent.keyDown(options[9], { key: "ArrowRight" });
		expect(options[0]).toHaveFocus();
	});

	test("picking an emoji closes the picker", async () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0, onTrashtalk: vi.fn() });
		await fireEvent.click(screen.getByRole("button", { name: "Change your emoji" }));
		await fireEvent.click(screen.getByRole("button", { name: "Skull" }));
		await waitFor(() =>
			expect(screen.queryByRole("group", { name: "Trash talk" })).not.toBeInTheDocument()
		);
	});

	test("a disconnected opponent's strip reads Reconnecting and is announced", () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0, opponentDisconnected: true });
		expect(visibleLayers(1)[0]).toHaveTextContent("Reconnecting…");
		expect(visibleLayers(0)[0]).toHaveTextContent("Your turn");
		expect(screen.getAllByRole("status")[1]).toHaveTextContent("Bob disconnected");
	});

	test("a finished round keeps the result in a disconnected opponent's strip", () => {
		renderBoard({ status: { type: "winner", player: 0 }, myIndex: 0, opponentDisconnected: true });
		expect(visibleLayers(1)[0]).toHaveTextContent("Lost");
	});

	test("spectators see no reconnecting line", () => {
		renderBoard({ status: { type: "turn", player: 0 }, opponentDisconnected: true });
		expect(visibleLayers(1)[0]).not.toHaveTextContent("Reconnecting…");
		expect(screen.getAllByRole("status")[1].textContent?.trim()).toBe("");
	});

	test("clocks read as minutes and seconds, spoken with the player's name", () => {
		renderBoard({ footer: footer(), clock: { remaining: [65_000, 600_000], activeSeat: 0 } });
		expect(screen.getByText("Alice's clock: 1:05 remaining")).toHaveClass("sr-only");
		expect(screen.getByText("Bob's clock: 10:00 remaining")).toHaveClass("sr-only");
		expect(within(strip(0)).getByText("1:05")).toHaveAttribute("aria-hidden", "true");
	});

	test("a partial second rounds up so the clock never shows 0:00 with time left", () => {
		renderBoard({ footer: footer(), clock: { remaining: [400, 60_000], activeSeat: 0 } });
		expect(screen.getByText("Alice's clock: 0:01 remaining")).toBeInTheDocument();
	});

	test("clocks are hidden without a clock", () => {
		renderBoard({ footer: footer() });
		expect(screen.queryByText(/clock/)).not.toBeInTheDocument();
	});

	test("the running clock turns red in its last ten seconds", () => {
		renderBoard({ footer: footer(), clock: { remaining: [9_000, 9_000], activeSeat: 0 } });
		expect(within(strip(0)).getByText("0:09")).toHaveClass("text-destructive");
	});

	test("a paused clock stays in its player's color even when low", () => {
		renderBoard({ footer: footer(), clock: { remaining: [9_000, 9_000], activeSeat: 0 } });
		const bobClock = within(strip(1)).getByText("0:09");
		expect(bobClock).toHaveClass("text-pink-500");
		expect(bobClock).not.toHaveClass("text-destructive");
	});

	test("the room bar shows the room code and which round is displayed", () => {
		renderBoard({ room: ROOM, footer: footer() });
		const bar = document.querySelector<HTMLElement>("[data-slot=room-bar]")!;
		expect(within(bar).getByText("ABCD")).toBeInTheDocument();
		expect(within(bar).getByText("Round 2 of 3")).toBeInTheDocument();
		expect(follows(bar, strip(1))).toBe(true);
	});

	test("previous round navigates one round back", async () => {
		const onGoToRound = vi.fn();
		renderBoard({ room: ROOM, footer: footer({ onGoToRound }) });
		await fireEvent.click(screen.getByRole("button", { name: "Previous round" }));
		expect(onGoToRound).toHaveBeenCalledWith(1);
	});

	test("next round navigates one round forward", async () => {
		const onGoToRound = vi.fn();
		renderBoard({ room: ROOM, footer: footer({ onGoToRound }) });
		await fireEvent.click(screen.getByRole("button", { name: "Next round" }));
		expect(onGoToRound).toHaveBeenCalledWith(3);
	});

	test("previous round is disabled on the first round", () => {
		renderBoard({ room: ROOM, footer: footer({ round: 1 }) });
		expect(screen.getByRole("button", { name: "Previous round" })).toBeDisabled();
	});

	test("next round is disabled on the latest round", () => {
		renderBoard({ room: ROOM, footer: footer({ round: 3 }) });
		expect(screen.getByRole("button", { name: "Next round" })).toBeDisabled();
	});

	test("the replay buttons step through the round's moves", async () => {
		const moves = replay({ canStepForward: true, isViewingHistory: true, moveNumber: 2 });
		renderBoard({ footer: footer(), replay: moves });
		await fireEvent.click(screen.getByRole("button", { name: "First move" }));
		await fireEvent.click(screen.getByRole("button", { name: "Previous move" }));
		await fireEvent.click(screen.getByRole("button", { name: "Next move" }));
		await fireEvent.click(screen.getByRole("button", { name: "Live" }));
		expect(moves.onFirst).toHaveBeenCalledOnce();
		expect(moves.onBack).toHaveBeenCalledOnce();
		expect(moves.onForward).toHaveBeenCalledOnce();
		expect(moves.onLive).toHaveBeenCalledOnce();
	});

	test("next move and live are disabled at the live position", () => {
		renderBoard({ footer: footer(), replay: replay() });
		expect(screen.getByRole("button", { name: "Next move" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Live" })).toBeDisabled();
	});

	test("first and previous move are disabled before any move", () => {
		renderBoard({ footer: footer(), replay: replay({ canStepBack: false, moveNumber: 0 }) });
		expect(screen.getByRole("button", { name: "First move" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Previous move" })).toBeDisabled();
	});

	test("scrubbing shows the move number under the replay buttons, not over the board", () => {
		const moves = replay({ isViewingHistory: true, moveNumber: 2, canStepForward: true });
		renderBoard({ footer: footer(), replay: moves });
		expect(moveReadout()).toHaveTextContent("Move 2 of 3");
		expect(follows(controls(), moveReadout())).toBe(true);
		expect(within(boardArea()).queryByText(/Move/)).not.toBeInTheDocument();
		expect(within(boardArea()).queryByRole("button")).not.toBeInTheDocument();
		expect(within(controls()).getByRole("button", { name: "Live" })).toBeEnabled();
	});

	test("at the live position the move readout keeps its slot but stays empty", () => {
		renderBoard({ footer: footer(), replay: replay() });
		expect(moveReadout()).toBeInTheDocument();
		expect(moveReadout().textContent?.trim()).toBe("");
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
		await fireEvent.click(within(controls()).getByRole("button", { name: "Play again" }));
		expect(onPlayAgain).toHaveBeenCalledOnce();
	});

	test("a host waiting for an opponent can abandon after confirming", async () => {
		const onAbandon = vi.fn();
		renderBoard({
			myIndex: 0,
			status: { type: "waiting" },
			footer: footer({ waitingForOpponent: true, onAbandon })
		});
		await fireEvent.click(screen.getByRole("button", { name: "Abandon" }));
		expect(await screen.findByText("Leave and close this room?")).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: "Close room" }));
		expect(onAbandon).toHaveBeenCalledOnce();
	});

	test("a spectator sees a Spectating pill instead of the round action", () => {
		renderBoard({ status: { type: "turn", player: 0 }, footer: footer() });
		expect(screen.getByText("Spectating")).toBeInTheDocument();
		for (const name of ["Resign", "Rematch", "Abandon"]) {
			expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
		}
	});

	test("resigning asks for confirmation before forfeiting the round", async () => {
		const onResign = vi.fn();
		renderBoard({ myIndex: 0, status: { type: "turn", player: 0 }, footer: footer({ onResign }) });

		await openMenu("Resign");
		await fireEvent.click(screen.getByRole("menuitem", { name: "Resign" }));
		expect(await screen.findByText("Resign this round?")).toBeInTheDocument();
		expect(onResign).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole("button", { name: "Resign round" }));

		expect(onResign).toHaveBeenCalledOnce();
	});

	test("cancelling a resignation sends nothing", async () => {
		const onResign = vi.fn();
		renderBoard({ myIndex: 0, status: { type: "turn", player: 0 }, footer: footer({ onResign }) });

		await openMenu("Resign");
		await fireEvent.click(screen.getByRole("menuitem", { name: "Resign" }));
		await fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

		expect(onResign).not.toHaveBeenCalled();
	});

	test("the Resign menu also offers abandoning the room, after confirming", async () => {
		const onAbandon = vi.fn();
		renderBoard({ myIndex: 0, status: { type: "turn", player: 0 }, footer: footer({ onAbandon }) });

		await openMenu("Resign");
		await fireEvent.click(screen.getByRole("menuitem", { name: "Abandon" }));
		await fireEvent.click(await screen.findByRole("button", { name: "Close room" }));

		expect(onAbandon).toHaveBeenCalledOnce();
	});

	test("a finished round offers a rematch in one click", async () => {
		const onRematch = vi.fn();
		renderBoard({ myIndex: 0, status: { type: "draw" }, footer: footer({ onRematch }) });

		await fireEvent.click(within(controls()).getByRole("button", { name: "Rematch" }));

		expect(onRematch).toHaveBeenCalledOnce();
	});

	test("a footer error is shown to the viewer", () => {
		renderBoard({ footer: footer({ error: "Time's up" }) });
		expect(screen.getByRole("alert")).toHaveTextContent("Time's up");
		expect(screen.getByRole("alert")).toHaveClass("opacity-100");
	});

	test("the error slot keeps its one-line height while empty", () => {
		renderBoard({ footer: footer({ error: null }) });
		const slot = screen.getByRole("alert");
		expect(slot.textContent?.trim()).toBe("");
		expect(slot).toHaveClass("h-5", "opacity-0");
	});

	test("the notice line holds only the room error, never the disconnect notice", () => {
		renderBoard({
			myIndex: 0,
			status: { type: "turn", player: 1 },
			opponentDisconnected: true,
			footer: footer({ error: "Not your turn" })
		});
		expect(screen.getByRole("alert")).toHaveTextContent("Not your turn");
		expect(screen.getByRole("alert")).not.toHaveTextContent("disconnected");
	});

	test("a finished round shows the result card over the board", () => {
		renderBoard({
			myIndex: 0,
			status: { type: "winner", player: 0, reason: "resign" },
			footer: footer()
		});
		const card = within(boardArea());
		expect(card.getByRole("heading", { name: "You won" })).toBeInTheDocument();
		expect(card.getByText("Bob resigned")).toBeInTheDocument();
		expect(card.getByRole("button", { name: "Rematch" })).toBeInTheDocument();
		expect(card.getByRole("button", { name: "New opponent" })).toBeInTheDocument();
		expect(card.getByRole("button", { name: "Lobby" })).toBeInTheDocument();
	});

	test("the result card's rating line shows the round's settled change", () => {
		renderBoard({
			myIndex: 0,
			status: { type: "winner", player: 0 },
			footer: footer(),
			rounds: [{ round: 2, result: "win", mmr: 8 }]
		});
		expect(within(boardArea()).getByText("+8 rating")).toBeInTheDocument();
	});

	test.each([
		["Rematch", "onRematch"],
		["New opponent", "onNewOpponent"],
		["Lobby", "onLobby"]
	] as const)("the result card's %s button calls %s", async (name, callback) => {
		const actions = footer();
		renderBoard({ myIndex: 0, status: { type: "draw" }, footer: actions });
		await fireEvent.click(within(boardArea()).getByRole("button", { name }));
		expect(actions[callback]).toHaveBeenCalledOnce();
	});

	test("the controls hide their round action while the result card shows it", () => {
		renderBoard({ myIndex: 0, status: { type: "draw" }, footer: footer() });
		const action = within(controls()).getByRole("button", { name: "Rematch" });
		expect(action.closest("[data-slot=round-action]")).toHaveClass("invisible");
	});

	test("the side panel hides its round action while the result card shows it", () => {
		renderBoard({ room: ROOM, myIndex: 0, status: { type: "draw" }, footer: footer() });
		const panel = within(screen.getByRole("complementary", { name: "Room" }));
		const action = panel.getByRole("button", { name: "Rematch" });
		expect(action.closest("[data-slot=round-action]")).toHaveClass("invisible");
	});

	test("View board hides the result card and shows Rematch in the controls", async () => {
		renderBoard({ myIndex: 0, status: { type: "draw" }, footer: footer() });
		await fireEvent.click(screen.getByRole("button", { name: "View board" }));
		await waitFor(() => expect(within(boardArea()).queryByRole("heading")).not.toBeInTheDocument());
		const action = within(controls()).getByRole("button", { name: "Rematch" });
		expect(action.closest("[data-slot=round-action]")).not.toHaveClass("invisible");
	});

	test("the result card leaves Lobby to the header nav from sm", () => {
		renderBoard({ myIndex: 0, status: { type: "draw" }, footer: footer() });
		const card = within(boardArea());
		expect(card.getByRole("button", { name: "Lobby" })).toHaveClass("sm:hidden");
		expect(card.getByRole("button", { name: "New opponent" })).toHaveClass("sm:col-span-2");
	});

	test("Escape hides the result card", async () => {
		renderBoard({ myIndex: 0, status: { type: "draw" }, footer: footer() });
		await fireEvent.keyDown(window, { key: "Escape" });
		await waitFor(() => expect(within(boardArea()).queryByRole("heading")).not.toBeInTheDocument());
	});

	test("no result card shows while scrubbing", () => {
		renderBoard({
			myIndex: 0,
			status: { type: "draw" },
			footer: footer(),
			replay: replay({ isViewingHistory: true })
		});
		expect(within(boardArea()).queryByRole("heading")).not.toBeInTheDocument();
	});

	test("a closed room's card offers Play again and the lobby", () => {
		renderBoard({
			myIndex: 0,
			status: { type: "winner", player: 0, reason: "abandon" },
			footer: footer({ roomClosed: true })
		});
		const card = within(boardArea());
		expect(card.getByRole("heading", { name: "Bob left the room" })).toBeInTheDocument();
		expect(card.getByRole("button", { name: "Play again" })).toBeInTheDocument();
		expect(card.queryByRole("button", { name: "Rematch" })).not.toBeInTheDocument();
	});

	test("a waiting host sees the invite card with the code and Copy link", () => {
		renderBoard({
			room: ROOM,
			myIndex: 0,
			status: { type: "waiting" },
			footer: footer({ waitingForOpponent: true })
		});
		const card = within(boardArea());
		expect(card.getByRole("heading", { name: "Waiting for an opponent" })).toBeInTheDocument();
		expect(card.getByText("ABCD")).toBeInTheDocument();
		expect(card.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
	});

	test("while the invite card shows, the room bar and side panel hide their Copy link", () => {
		renderBoard({
			room: ROOM,
			myIndex: 0,
			status: { type: "waiting" },
			footer: footer({ waitingForOpponent: true })
		});
		const bar = document.querySelector<HTMLElement>("[data-slot=room-bar]")!;
		const panel = screen.getByRole("complementary", { name: "Room" });
		expect(within(bar).getByRole("button", { name: "Copy link" })).toHaveClass("invisible");
		expect(within(panel).getByRole("button", { name: "Copy link" })).toHaveClass("invisible");
	});

	test("once a game is on, the room bar and side panel offer Copy link", () => {
		renderBoard({ room: ROOM, myIndex: 0, status: { type: "turn", player: 0 }, footer: footer() });
		const bar = document.querySelector<HTMLElement>("[data-slot=room-bar]")!;
		const panel = screen.getByRole("complementary", { name: "Room" });
		expect(within(bar).getByRole("button", { name: "Copy link" })).not.toHaveClass("invisible");
		expect(within(panel).getByRole("button", { name: "Copy link" })).not.toHaveClass("invisible");
	});

	test("the invite card offers Share only where the browser can share", () => {
		vi.stubGlobal("navigator", { ...navigator, share: vi.fn() });
		onTestFinished(() => {
			vi.unstubAllGlobals();
		});
		renderBoard({
			room: ROOM,
			myIndex: 0,
			status: { type: "waiting" },
			footer: footer({ waitingForOpponent: true })
		});
		expect(within(boardArea()).getByRole("button", { name: "Share" })).toBeInTheDocument();
	});

	test("the invite card has no Share without navigator.share", () => {
		renderBoard({
			room: ROOM,
			myIndex: 0,
			status: { type: "waiting" },
			footer: footer({ waitingForOpponent: true })
		});
		expect(within(boardArea()).queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
	});

	test("a spectator sees the invite card without its buttons", () => {
		renderBoard({
			room: ROOM,
			status: { type: "waiting" },
			footer: footer({ waitingForOpponent: true })
		});
		const card = within(boardArea());
		expect(card.getByRole("heading", { name: "Waiting for an opponent" })).toBeInTheDocument();
		expect(card.queryByRole("button")).not.toBeInTheDocument();
	});

	test("the side panel lists the viewer's rounds with results and rating changes", () => {
		renderBoard({
			room: ROOM,
			myIndex: 0,
			status: { type: "turn", player: 0 },
			footer: footer({ round: 3 }),
			rounds: [
				{ round: 3, result: "playing", mmr: null },
				{ round: 2, result: "loss", mmr: -8 },
				{ round: 1, result: "win", mmr: 8 }
			]
		});
		const panel = within(screen.getByRole("complementary", { name: "Room" }));
		const links = panel.getAllByRole("link");
		expect(links.map((link) => link.textContent?.replace(/\s+/g, " ").trim())).toEqual([
			"Round 3 Playing —",
			"Round 2 Loss −8",
			"Round 1 Win +8"
		]);
		expect(links[2]).toHaveAttribute("href", "/tictactoe/ABCD/1");
		expect(links[0]).toHaveAttribute("aria-current", "page");
	});

	test("the side panel holds the replay buttons, then the round action at its bottom", async () => {
		const onResign = vi.fn();
		const moves = replay();
		renderBoard({
			room: ROOM,
			myIndex: 0,
			status: { type: "turn", player: 0 },
			footer: footer({ onResign }),
			replay: moves
		});
		const panel = screen.getByRole("complementary", { name: "Room" });
		const back = within(panel).getByRole("button", { name: "Previous move" });
		const resign = within(panel).getByRole("button", { name: "Resign" });
		expect(follows(back, resign)).toBe(true);
		expect(panel.lastElementChild?.lastElementChild).toContainElement(resign);
		await fireEvent.click(back);
		expect(moves.onBack).toHaveBeenCalledOnce();
	});

	test("the side panel shows the move number between the replay buttons", () => {
		renderBoard({
			room: ROOM,
			myIndex: 0,
			status: { type: "turn", player: 0 },
			footer: footer(),
			replay: replay({ isViewingHistory: true, moveNumber: 2, canStepForward: true })
		});
		const panel = within(screen.getByRole("complementary", { name: "Room" }));
		const readout = panel.getByText("Move 2 of 3");
		expect(follows(panel.getByRole("button", { name: "Previous move" }), readout)).toBe(true);
		expect(follows(readout, panel.getByRole("button", { name: "Next move" }))).toBe(true);
	});

	test("the side panel doesn't repeat the players, scores, or clocks", () => {
		renderBoard({
			room: ROOM,
			myIndex: 0,
			status: { type: "turn", player: 0 },
			footer: footer(),
			clock: { remaining: [65_000, 600_000], activeSeat: 0 }
		});
		const panel = within(screen.getByRole("complementary", { name: "Room" }));
		expect(panel.queryByText("Alice")).not.toBeInTheDocument();
		expect(panel.queryByText("Bob")).not.toBeInTheDocument();
		expect(panel.queryByText(/Score/)).not.toBeInTheDocument();
		expect(panel.queryByText("1:05")).not.toBeInTheDocument();
	});

	test("the board area describes its keys to screen readers", () => {
		renderBoard();
		expect(
			within(boardArea()).getByText("Arrow keys move on the board. [ and ] step through moves.")
		).toBeInTheDocument();
	});

	test("the side panel offers the keyboard shortcuts on hover or focus", async () => {
		// jsdom has no ResizeObserver, which the tooltip uses to track its trigger.
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			}
		);
		onTestFinished(() => {
			vi.unstubAllGlobals();
		});
		renderBoard({ room: ROOM, myIndex: 0, footer: footer() });
		const panel = within(screen.getByRole("complementary", { name: "Room" }));
		const trigger = panel.getByRole("button", { name: "Keyboard shortcuts" });
		trigger.focus();
		await fireEvent.focus(trigger);
		expect(await screen.findAllByText("Step through moves")).not.toHaveLength(0);
	});

	test("a spectator's side panel has no round list", () => {
		renderBoard({ room: ROOM, status: { type: "turn", player: 0 }, footer: footer() });
		const panel = within(screen.getByRole("complementary", { name: "Room" }));
		expect(panel.queryByRole("link")).not.toBeInTheDocument();
		expect(panel.getByText("Spectating")).toBeInTheDocument();
	});

	test("the viewer's strip reads You must capture on a forced capture", () => {
		renderBoard({ myIndex: 0, status: { type: "turn", player: 0 }, mustCapture: true });
		expect(visibleLayers(0)[0]).toHaveTextContent("You must capture");
	});

	test("a rules snippet adds a Rules popover", async () => {
		const rules = createRawSnippet(() => ({ render: () => "<p>Three in a row wins a board.</p>" }));
		renderBoard({ room: ROOM, footer: footer(), rules });
		const [trigger] = screen.getAllByRole("button", { name: "Rules" });
		await fireEvent.click(trigger);
		expect(await screen.findByText("Three in a row wins a board.")).toBeInTheDocument();
	});

	test("no Rules button without a rules snippet", () => {
		renderBoard({ room: ROOM, footer: footer() });
		expect(screen.queryByRole("button", { name: "Rules" })).not.toBeInTheDocument();
	});

	test.each([
		[{ type: "turn" as const, player: 1 as const }, null, "Bob's turn"],
		[{ type: "turn" as const, player: 0 as const }, 0 as const, "Your turn"],
		[{ type: "winner" as const, player: 1 as const }, 0 as const, "Bob won"],
		[{ type: "winner" as const, player: 1 as const }, 1 as const, "You won"],
		[{ type: "winner" as const, player: 0 as const }, null, "Alice won"]
	])("status %o seen by seat %s reads %s to screen readers", (status, myIndex, text) => {
		renderBoard({ status, myIndex });
		expect(gameStatus()).toHaveTextContent(text);
		expect(gameStatus()).toHaveClass("sr-only");
	});

	test("a forced capture on the viewer's turn is spoken with the turn", () => {
		renderBoard({ myIndex: 0, status: { type: "turn", player: 0 }, mustCapture: true });
		expect(gameStatus()).toHaveTextContent("Your turn. You must capture.");
	});

	test("status changes are announced politely", async () => {
		const { rerender } = renderBoard({ status: { type: "turn", player: 0 } });
		const region = gameStatus();
		expect(region).toHaveTextContent("Alice's turn");

		await rerender({ status: { type: "winner", player: 1 } });

		expect(region).toHaveTextContent("Bob won");
		expect(region).toHaveClass("sr-only");
	});

	test.each([
		["Resign", { myIndex: 0 as const, status: { type: "turn" as const, player: 0 as const } }, {}],
		["Rematch", { myIndex: 0 as const, status: { type: "draw" as const } }, {}],
		["Go live", {}, { isLive: false }],
		["Play again", { myIndex: 0 as const }, { roomClosed: true }],
		["Abandon", { myIndex: 0 as const }, { waitingForOpponent: true }]
	])("the %s button sits in a fixed-width slot", (name, props, overrides) => {
		renderBoard({ ...props, footer: footer(overrides) });
		const button = within(controls()).getByRole("button", { name });
		expect(button.closest("[data-slot=round-action]")).toHaveClass("w-28", "sm:w-32");
	});

	test("the board takes the room's content width on phones", () => {
		expect(BOARD_SIZE.startsWith("min(calc(100vw - 1.5rem)")).toBe(true);
	});

	test("a new rejectionId shakes the board area with transform-only keyframes", async () => {
		const animate = vi.spyOn(Element.prototype, "animate");
		onTestFinished(() => animate.mockRestore());
		const { rerender } = renderBoard({ rejectionId: null });
		expect(animate).not.toHaveBeenCalled();

		await rerender({ rejectionId: 1 });
		await rerender({ rejectionId: 2 });

		expect(animate).toHaveBeenCalledTimes(2);
		expect(animate.mock.contexts).toEqual([boardArea(), boardArea()]);
		const keyframes = animate.mock.calls[0][0] as Keyframe[];
		expect(keyframes.length).toBeGreaterThan(1);
		for (const frame of keyframes) expect(Object.keys(frame)).toEqual(["transform"]);
	});

	test("a board mounted with an earlier rejectionId shakes only for a later one", async () => {
		const animate = vi.spyOn(Element.prototype, "animate");
		onTestFinished(() => animate.mockRestore());
		const { rerender } = renderBoard({ rejectionId: 1 });
		expect(animate).not.toHaveBeenCalled();

		await rerender({ rejectionId: 2 });

		expect(animate).toHaveBeenCalledOnce();
	});

	test("a rejection doesn't shake the board under reduced motion", async () => {
		const animate = vi.spyOn(Element.prototype, "animate");
		const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation(
			(query) =>
				({
					matches: query === "(prefers-reduced-motion: reduce)",
					media: query
				}) as MediaQueryList
		);
		onTestFinished(() => {
			animate.mockRestore();
			matchMedia.mockRestore();
		});
		const { rerender } = renderBoard({ rejectionId: null });

		await rerender({ rejectionId: 1 });

		expect(animate).not.toHaveBeenCalled();
	});

	test.each([
		[0 as const, "win"],
		[1 as const, "loss"]
	])("seat %s sees seat 0's win as %s in the mood", (myIndex, outcome) => {
		const mood = withMood();
		renderBoard({ myIndex, status: { type: "winner", player: 0 }, footer: footer() });
		expect(mood.outcome).toBe(outcome);
	});

	test("a draw reads draw in the mood", () => {
		const mood = withMood();
		renderBoard({ myIndex: 0, status: { type: "draw" }, footer: footer() });
		expect(mood.outcome).toBe("draw");
	});

	test("a spectator's finished round leaves the mood outcome null", () => {
		const mood = withMood();
		renderBoard({ myIndex: null, status: { type: "winner", player: 0 }, footer: footer() });
		expect(mood.outcome).toBeNull();
	});

	test("a closed room leaves the mood outcome null", () => {
		const mood = withMood();
		renderBoard({ myIndex: 0, footer: footer({ roomClosed: true }) });
		expect(mood.outcome).toBeNull();
	});

	test("View board keeps the mood outcome", async () => {
		const mood = withMood();
		renderBoard({ myIndex: 0, status: { type: "winner", player: 0 }, footer: footer() });
		await fireEvent.click(screen.getByRole("button", { name: "View board" }));
		await waitFor(() => expect(within(boardArea()).queryByRole("heading")).not.toBeInTheDocument());
		expect(mood.outcome).toBe("win");
	});

	test("the next round clears the mood outcome", async () => {
		const mood = withMood();
		const { rerender } = renderBoard({
			myIndex: 0,
			status: { type: "winner", player: 0 },
			footer: footer()
		});
		await rerender({ status: { type: "turn", player: 1 } });
		expect(mood.outcome).toBeNull();
	});

	test("unmounting clears the mood outcome", () => {
		const mood = withMood();
		const { unmount } = renderBoard({ myIndex: 0, status: { type: "draw" }, footer: footer() });
		unmount();
		expect(mood.outcome).toBeNull();
	});

	test("the board size defaults to BOARD_SIZE", () => {
		const { container } = renderBoard();
		const root = container.querySelector<HTMLElement>("[style]");
		expect(root?.style.getPropertyValue("--board-size")).toBe(BOARD_SIZE);
	});
});
