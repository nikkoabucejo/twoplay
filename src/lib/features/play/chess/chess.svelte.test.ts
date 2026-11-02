import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, onTestFinished, test, vi } from "vitest";
import type { Toaster } from "$lib/components/ui";
import { ClerkAuth } from "$lib/services/auth";
import {
	historyOf,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { ACCENTS } from "$lib/utils/style";
import { api } from "../../../../../convex/_generated/api.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
import { positionKey } from "../../../../../convex/models/games/chess/rules.js";
import Chess from "./chess.svelte";
import ChessPiece from "./piece.svelte";
import type { ChessMove, ChessState } from "./types.js";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));
vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

vi.mock("$lib/utils/storage", async (importOriginal) => {
	const storage = await importOriginal<typeof import("$lib/utils/storage")>();
	return { ...storage, getPreferences: () => new storage.PreferencesStore(null) };
});

vi.mock("$lib/utils/sound", () => ({
	prepareSound: vi.fn(),
	playMoveSound: vi.fn(),
	playCaptureSound: vi.fn(),
	playTurnChime: vi.fn()
}));

const context = vi.hoisted(() => ({
	auth: null as ClerkAuth | null,
	toaster: null as Toaster | null
}));

// A real Toaster per test, made here because importing the mocked barrel's values bypasses the mock.
vi.mock("$lib/components/ui", async (importOriginal) => {
	const ui = await importOriginal<typeof import("$lib/components/ui")>();
	return { ...ui, getToaster: () => (context.toaster ??= new ui.Toaster()) };
});

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

// Keep the real lottie-web inert, as in board.svelte.test.ts: it paints a canvas, then fetches JSON.
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

const initial = chessEngine.createInitialState();
const PROMOTING = at("8/1P5k/8/8/8/8/8/K7 w - - 0 1");

function at(fen: string): ChessState {
	return { kind: "chess", fen, positions: [positionKey(fen)] };
}

/** Each position after the from-to moves, played by alternating seats from `start`. */
function line(start: ChessState, ...moves: string[]): ChessState[] {
	let state = start;
	return moves.map((text, ply) => {
		const move: ChessMove = { kind: "chess", from: text.slice(0, 2), to: text.slice(2) };
		state = chessEngine.applyMove(state, ply % 2, move);
		return state;
	});
}

function signIn() {
	const auth = new ClerkAuth();
	auth.hydrate({ id: "user-1", email: null, name: "Alice Archer", imageUrl: null });
	context.auth = auth;
	mutationFor(api.models.rooms.index.join).mockResolvedValue({ redirected: false });
}

function renderRoom(snapshot = roomSnapshot(initial), history?: ChessState[]) {
	signIn();
	setQueryResult(api.models.rooms.index.get, snapshot);
	if (history) setQueryResult(api.models.games.index.history, historyOf(history));
	render(Chess, { props: { roomCode: "ABCD" } });
	return screen.findByRole("group", { name: "Chess board" });
}

function square(board: HTMLElement, name: string) {
	return within(board).getByRole("button", { name: new RegExp(`^${name},`) });
}

function submittedMoves() {
	return mutationFor(api.models.rooms.index.play).mock.calls.map(([args]) => args.move);
}

async function openPicker() {
	const board = await renderRoom(roomSnapshot(PROMOTING));
	await fireEvent.click(square(board, "b7"));
	await fireEvent.click(square(board, "b8"));
	return { board, picker: await screen.findByRole("dialog", { name: "Promote to" }) };
}

beforeEach(() => {
	resetConvex();
	context.auth = new ClerkAuth();
	context.auth.hydrate(null);
	context.toaster = null;
});

describe("Chess", () => {
	test("signed out, asks to sign in", () => {
		render(Chess, { props: { roomCode: "ABCD" } });
		expect(screen.getByText("Sign in to join this Chess game.")).toBeInTheDocument();
	});

	test("the board is a group of 64 square buttons, with no grid role", async () => {
		const board = await renderRoom();
		expect(within(board).getAllByRole("button")).toHaveLength(64);
		expect(screen.queryAllByRole("grid")).toHaveLength(0);
	});

	test.each([
		["seat 0", "a1", 0 as const],
		["seat 1", "h8", 1 as const],
		["a spectator", "a1", null]
	])("%s sees %s in the bottom-left corner", async (_, corner, myIndex) => {
		const board = await renderRoom(roomSnapshot(initial, { myIndex }));
		const squares = within(board).getAllByRole("button");
		expect(squares[56].getAttribute("aria-label")).toMatch(new RegExp(`^${corner},`));
	});

	test("board squares sit inside a click-sound opt-out region", async () => {
		const board = await renderRoom();
		expect(board).toHaveAttribute("data-sfx", "off");
	});

	test("squares are named by coordinate, piece, and whether it can move", async () => {
		const board = await renderRoom();
		expect(square(board, "g1")).toHaveAccessibleName("g1, white knight, can move");
		expect(square(board, "a1")).toHaveAccessibleName("a1, white rook");
		expect(square(board, "e4")).toHaveAccessibleName("e4, empty");
	});

	test("selecting a piece names it selected and its targets move here", async () => {
		const board = await renderRoom();
		await fireEvent.click(square(board, "g1"));
		expect(square(board, "g1")).toHaveAccessibleName("g1, white knight, selected");
		expect(square(board, "f3")).toHaveAccessibleName("f3, empty, move here");
	});

	test("clicking the selected piece again restores its names", async () => {
		const board = await renderRoom();
		await fireEvent.click(square(board, "g1"));
		await fireEvent.click(square(board, "g1"));
		expect(square(board, "g1")).toHaveAccessibleName("g1, white knight, can move");
		expect(square(board, "f3")).toHaveAccessibleName("f3, empty");
	});

	test("pieces are drawn in their seat's accent", async () => {
		const board = await renderRoom();
		expect(square(board, "g1").querySelector("svg")).toHaveClass(ACCENTS[0].text);
		expect(square(board, "g8").querySelector("svg")).toHaveClass(ACCENTS[1].text);
	});

	test("the last move's squares carry the mover's tint", async () => {
		const [e4, e5] = line(initial, "e2e4", "e7e5");
		const board = await renderRoom(roomSnapshot(e5), [e4, e5]);
		await waitFor(() => expect(square(board, "e7")).toHaveClass(ACCENTS[1].tintBg));
		expect(square(board, "e5")).toHaveClass(ACCENTS[1].tintBg);
		const tinted = within(board)
			.getAllByRole("button")
			.filter((button) => button.classList.contains(ACCENTS[1].tintBg));
		expect(tinted).toHaveLength(2);
	});

	test("the checked king's square carries the check mark", async () => {
		const board = await renderRoom(
			roomSnapshot(at("4k3/8/8/8/8/8/8/4R1K1 b - - 0 1"), { myIndex: 1 })
		);
		expect(square(board, "e8")).toHaveAccessibleName("e8, black king, in check, can move");
		expect(square(board, "e8")).toHaveClass("bg-destructive/20");
		expect(square(board, "e1")).not.toHaveClass("bg-destructive/20");
	});

	test("the last move tint replaces the dark square shade", async () => {
		const [e4, e5] = line(initial, "e2e4", "e7e5");
		const moved = await renderRoom(roomSnapshot(e5), [e4, e5]);
		await waitFor(() => expect(square(moved, "e7")).toHaveClass(ACCENTS[1].tintBg));
		expect(square(moved, "e7")).not.toHaveClass("bg-foreground/15");
		expect(square(moved, "g7")).toHaveClass("bg-foreground/15");
	});

	test("a checked king on a dark square shows the check mark, not the shade", async () => {
		const board = await renderRoom(
			roomSnapshot(at("3k4/8/8/8/8/8/8/3R2K1 b - - 0 1"), { myIndex: 1 })
		);
		expect(square(board, "d8")).toHaveClass("bg-destructive/20");
		expect(square(board, "d8")).not.toHaveClass("bg-foreground/15");
	});

	test("a capture destination is ringed, and an empty destination gets a dot", async () => {
		const board = await renderRoom(roomSnapshot(at("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1")));
		await fireEvent.click(square(board, "e4"));
		const capture = square(board, "d5");
		const quiet = square(board, "e5");
		expect(capture.querySelector("[data-hint=capture]")).toHaveClass("ring-emerald-400/70");
		expect(capture.querySelector("[data-hint=move]")).toBeNull();
		expect(quiet.querySelector("[data-hint=move]")).toHaveClass("bg-emerald-400/70");
		expect(quiet.querySelector("[data-hint=capture]")).toBeNull();
	});

	test("the last move is read out in SAN and not shown", async () => {
		const [nf3] = line(initial, "g1f3");
		const board = await renderRoom(roomSnapshot(nf3), [nf3]);
		const text = await within(board).findByText("Last move: Nf3");
		expect(text).toHaveClass("sr-only");
	});

	test("the strips show each seat's king, decorative", async () => {
		await renderRoom();
		for (const seat of [0, 1] as const) {
			const icon = document.querySelector(
				`[data-slot=strip][data-seat='${seat}'] [data-slot=mark] svg`
			);
			expect(icon).toHaveClass("lucide-chess-king", ACCENTS[seat].text);
			expect(icon?.closest("[aria-hidden=true]")).not.toBeNull();
		}
	});

	test("a pawn reaching the last rank opens the picker with four pieces", async () => {
		const { picker } = await openPicker();
		const names = within(picker)
			.getAllByRole("button")
			.map((button) => button.getAttribute("aria-label"));
		expect(names).toEqual(["Queen", "Rook", "Bishop", "Knight"]);
		expect(submittedMoves()).toEqual([]);
	});

	test("the picker opens with focus on Queen, and Tab reaches the other choices", async () => {
		const { picker } = await openPicker();
		const [queen, ...rest] = within(picker).getAllByRole("button");
		await waitFor(() => expect(queen).toHaveFocus());
		for (const button of rest) {
			expect(button).toBeEnabled();
			expect(button.tabIndex).toBe(0);
		}
	});

	test("choosing Knight sends the promotion", async () => {
		const { picker } = await openPicker();
		await fireEvent.click(within(picker).getByRole("button", { name: "Knight" }));
		const move: ChessMove = { kind: "chess", from: "b7", to: "b8", promotion: "n" };
		expect(submittedMoves()).toEqual([move]);
	});

	test("Escape closes the picker, sends no move, and leaves the pawn", async () => {
		const { board, picker } = await openPicker();
		await fireEvent.keyDown(picker, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		expect(submittedMoves()).toEqual([]);
		expect(square(board, "b7")).toHaveAccessibleName("b7, white pawn, can move");
		await waitFor(() => expect(square(board, "b8")).toHaveFocus());
	});

	test("a rejected move shows a toast and shakes the board", async () => {
		const animate = vi.spyOn(Element.prototype, "animate");
		onTestFinished(() => animate.mockRestore());
		mutationFor(api.models.rooms.index.play).mockRejectedValue(new Error("Not your turn"));
		const board = await renderRoom();

		await fireEvent.click(square(board, "e2"));
		await fireEvent.click(square(board, "e4"));
		await vi.waitFor(() => expect(context.toaster?.items).toHaveLength(1));

		expect(context.toaster?.items).toEqual([
			{ id: expect.any(Number), message: "Move not accepted", tone: "error" }
		]);
		const shaken = animate.mock.contexts.filter(
			(element) => element instanceof Element && element.contains(board)
		);
		expect(shaken).toHaveLength(1);
	});

	test("one square is in the tab order, and arrows move focus as drawn", async () => {
		const board = await renderRoom();
		const tabStops = within(board)
			.getAllByRole("button")
			.filter((button) => button.tabIndex === 0);
		expect(tabStops).toHaveLength(1);

		tabStops[0].focus();
		await fireEvent.keyDown(tabStops[0], { key: "End" });
		expect(document.activeElement).toBe(square(board, "h1"));
		await fireEvent.keyDown(square(board, "h1"), { key: "ArrowLeft" });
		expect(document.activeElement).toBe(square(board, "g1"));
		await fireEvent.keyDown(square(board, "g1"), { key: "ArrowUp" });
		expect(document.activeElement).toBe(square(board, "g2"));
	});

	test("for black, arrows follow the flipped board", async () => {
		const board = await renderRoom(roomSnapshot(initial, { myIndex: 1 }));
		square(board, "e2").focus();
		await fireEvent.keyDown(square(board, "e2"), { key: "ArrowRight" });
		expect(document.activeElement).toBe(square(board, "d2"));
		await fireEvent.keyDown(square(board, "d2"), { key: "ArrowUp" });
		expect(document.activeElement).toBe(square(board, "d1"));
	});
});

describe("ChessPiece", () => {
	test.each([
		[{ color: "w", type: "n" } as const, "lucide-chess-knight", ACCENTS[0].text],
		[{ color: "b", type: "q" } as const, "lucide-chess-queen", ACCENTS[1].text]
	])("draws %o as its icon in the seat accent", (piece, icon, accent) => {
		const { container } = render(ChessPiece, { props: { piece } });
		expect(container.querySelector("svg")).toHaveClass(icon, accent);
	});

	test("is outlined with a faint tint, so its interior lines show", () => {
		const { container } = render(ChessPiece, { props: { piece: { color: "w", type: "b" } } });
		const svg = container.querySelector("svg");
		expect(svg).toHaveClass("fill-current/15");
		expect(svg).not.toHaveClass("fill-current");
		expect(svg).toHaveAttribute("stroke-width", "1.25");
	});
});
