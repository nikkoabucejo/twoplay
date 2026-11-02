import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { createRawSnippet, type ComponentProps } from "svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { BOARD_SIZE } from "./board.svelte";
import { Board, type BoardFooter, type BoardPlayer, type BoardStatus } from "./index.js";

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

/** A seat's player strip. */
function strip(seat: 0 | 1): HTMLElement {
	return document.querySelector<HTMLElement>(`[data-slot=strip][data-seat="${seat}"]`)!;
}

function strips(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>("[data-slot=strip]")];
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
			clock: { remaining: [65_000, 600_000], activeSeat: 0 }
		});
		const controls = screen
			.getByRole("button", { name: "Previous round" })
			.closest<HTMLElement>("[data-slot=controls]")!;
		expect(within(controls).queryByText(/clock/)).not.toBeInTheDocument();
		const lower = strip(0);
		expect(follows(lower, controls)).toBe(true);
		expect(follows(controls, screen.getByText("Round 2 of 3"))).toBe(true);
		expect(follows(screen.getByText("Round 2 of 3"), screen.getByRole("alert"))).toBe(true);
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

	test("passing the turn changes only the strips' ring color", async () => {
		const { rerender } = renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0 });
		const before = strips().map((element) => new Set(element.classList));
		expect(strip(0)).toHaveClass("ring-2", "ring-seat-0");
		expect(strip(1)).toHaveClass("ring-2", "ring-transparent");

		await rerender({ status: { type: "turn", player: 1 } });

		expect(strip(0)).toHaveClass("ring-2", "ring-transparent");
		expect(strip(1)).toHaveClass("ring-2", "ring-seat-1");
		const rings = new Set(["ring-seat-0", "ring-seat-1", "ring-transparent"]);
		strips().forEach((element, index) => {
			const after = new Set(element.classList);
			const changed = [...before[index], ...after].filter(
				(name) => before[index].has(name) !== after.has(name)
			);
			expect(changed.every((name) => rings.has(name))).toBe(true);
		});
	});

	test.each([
		{ type: "winner" as const, player: 0 as const },
		{ type: "draw" as const },
		{ type: "waiting" as const }
	])("no strip is ringed when the status is %o", (status) => {
		renderBoard({ status });
		expect(strip(0)).toHaveClass("ring-transparent");
		expect(strip(1)).toHaveClass("ring-transparent");
	});

	test("the status is announced once and the strip labels are hidden from screen readers", () => {
		renderBoard({
			players: [PLAYERS[0], { ...PLAYERS[1], label: "Blair" }],
			status: { type: "turn", player: 1 },
			myIndex: 0
		});
		expect(screen.getAllByRole("status")).toHaveLength(1);
		expect(screen.getByRole("status")).toHaveTextContent("Blair's turn");
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
		expect(screen.getByRole("status").textContent?.trim()).toBe(text);
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

	test("a disconnected opponent is flagged to a seated viewer", () => {
		renderBoard({ status: { type: "turn", player: 0 }, myIndex: 0, opponentDisconnected: true });
		expect(screen.getByRole("img", { name: "Opponent disconnected" })).toBeInTheDocument();
	});

	test("spectators don't see a disconnected flag", () => {
		renderBoard({ status: { type: "turn", player: 0 }, opponentDisconnected: true });
		expect(screen.queryByLabelText("Opponent disconnected")).not.toBeInTheDocument();
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
		expect(screen.getByRole("alert")).toHaveTextContent("Time's up");
		expect(screen.getByRole("alert")).toHaveClass("opacity-100");
	});

	test("the error slot keeps its one-line height while empty", () => {
		renderBoard({ footer: footer({ error: null }) });
		const slot = screen.getByRole("alert");
		expect(slot.textContent?.trim()).toBe("");
		expect(slot).toHaveClass("h-5", "truncate", "opacity-0");
	});

	test.each([
		[{ type: "turn" as const, player: 1 as const }, null, "Bob's turn"],
		[{ type: "turn" as const, player: 0 as const }, 0 as const, "Your turn"],
		[{ type: "winner" as const, player: 1 as const }, 0 as const, "Bob won"],
		[{ type: "winner" as const, player: 1 as const }, 1 as const, "You won"],
		[{ type: "winner" as const, player: 0 as const }, null, "Alice won"]
	])("status %o seen by seat %s reads %s to screen readers", (status, myIndex, text) => {
		renderBoard({ status, myIndex });
		expect(screen.getByRole("status")).toHaveTextContent(text);
		expect(screen.getByRole("status")).toHaveClass("sr-only");
	});

	test("status changes are announced politely", async () => {
		const { rerender } = renderBoard({ status: { type: "turn", player: 0 } });
		const region = screen.getByRole("status");
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
	])("the %s button has a fixed width", (name, props, overrides) => {
		renderBoard({ ...props, footer: footer(overrides) });
		expect(screen.getByRole("button", { name })).toHaveClass("w-28", "sm:w-32");
	});

	test("the board takes the room's content width on phones", () => {
		expect(BOARD_SIZE.startsWith("min(calc(100vw - 1.5rem)")).toBe(true);
	});

	test("the board size defaults to BOARD_SIZE", () => {
		const { container } = renderBoard();
		const root = container.querySelector<HTMLElement>("[style]");
		expect(root?.style.getPropertyValue("--board-size")).toBe(BOARD_SIZE);
	});
});
