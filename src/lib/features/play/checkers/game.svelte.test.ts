import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import {
	checkersEngine,
	type CheckersMove,
	type CheckersState
} from "../../../../../convex/models/games/checkers/index.js";
import { idx } from "../../../../../convex/models/games/checkers/rules.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import {
	ALICE,
	createRooted,
	historyOf,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { CheckersRoom } from "./game.svelte.js";
import type { Board, Piece } from "./types.js";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));

const CYAN: Piece = { color: "cyan", king: false };
const PINK: Piece = { color: "pink", king: false };

const initial = checkersEngine.createInitialState();

/** Cyan's front-left piece, which can only step to one square, and that square. */
const FRONT = idx(5, 0);
const FRONT_TO = idx(4, 1);
/** A cyan back-row piece, boxed in by its own side at the start. */
const BLOCKED = idx(6, 1);

function position(
	pieces: [index: number, piece: Piece][],
	overrides: Partial<Omit<CheckersState, "kind" | "board">> = {}
): CheckersState {
	const board: Board = Array(64).fill(null);
	for (const [index, piece] of pieces) board[index] = piece;
	return { kind: "checkers", board, turn: "cyan", mustContinueFrom: null, ...overrides };
}

/** Cyan at (5,2) can jump pink at (4,3); cyan at (5,6) could otherwise just step. */
const CAPTURER = idx(5, 2);
const CAPTURE_TO = idx(3, 4);
const BYSTANDER = idx(5, 6);
const mustCapture = position([
	[CAPTURER, CYAN],
	[idx(4, 3), PINK],
	[BYSTANDER, CYAN],
	[idx(0, 1), PINK]
]);

/** Mid multi-jump: the cyan piece at (3,4) must jump again, over pink at (2,5). */
const CHAIN_FROM = idx(3, 4);
const CHAIN_TO = idx(1, 6);
const midChain = position(
	[
		[CHAIN_FROM, CYAN],
		[idx(2, 5), PINK],
		[BYSTANDER, CYAN],
		[idx(0, 1), PINK]
	],
	{ mustContinueFrom: CHAIN_FROM }
);

let destroy: () => void;

function createRoom(snapshot = roomSnapshot(initial)) {
	setQueryResult(api.models.rooms.index.get, snapshot);
	const rooted = createRooted(() => new CheckersRoom(() => "ABCD"));
	destroy = () => {
		rooted.instance.dispose();
		rooted.destroy();
	};
	return rooted.instance;
}

function submittedMoves() {
	return mutationFor(api.models.rooms.index.play).mock.calls.map(([args]) => args.move);
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	destroy();
	resetConvex();
	vi.useRealTimers();
});

describe("CheckersRoom", () => {
	test("cyan moves first", () => {
		const room = createRoom();
		expect(room.turn).toBe("cyan");
	});

	test("seat 0 plays cyan", () => {
		const room = createRoom();
		expect(room.myColor).toBe("cyan");
	});

	test("seat 1 plays pink", () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: 1 }));
		expect(room.myColor).toBe("pink");
	});

	test("it's the cyan seat's turn at the start", () => {
		const room = createRoom();
		expect(room.isMyTurn).toBe(true);
	});

	test("it isn't the pink seat's turn at the start", () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: 1 }));
		expect(room.isMyTurn).toBe(false);
	});

	test("a spectator never has the turn", () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: null }));
		expect(room.isMyTurn).toBe(false);
	});

	test("the host has no turn while waiting for an opponent", () => {
		const room = createRoom(roomSnapshot(initial, { players: [ALICE, null] }));
		expect(room.isMyTurn).toBe(false);
	});

	test("the viewer has no turn on a pinned past round", () => {
		const room = createRoom(
			roomSnapshot(initial, { game: { round: 1, latestRound: 2, isLive: false } })
		);
		expect(room.isMyTurn).toBe(false);
	});

	test("the viewer has no turn once the round ended on a resignation", () => {
		const room = createRoom(roomSnapshot(initial, { game: { endedSeat: 1, reason: "resign" } }));
		expect(room.isMyTurn).toBe(false);
	});

	test("reviewing history keeps the viewer's turn but blocks their moves", () => {
		const first = checkersEngine.applyMove(initial, 0, {
			kind: "checkers",
			from: FRONT,
			to: FRONT_TO
		});
		const second = checkersEngine.applyMove(first, 1, {
			kind: "checkers",
			from: idx(2, 1),
			to: idx(3, 0)
		});
		const room = createRoom(roomSnapshot(second));
		setQueryResult(api.models.games.index.history, historyOf([first, second]));
		expect(room.canMove).toBe(true);

		room.stepBack();

		expect(room.isMyTurn).toBe(true);
		expect(room.canMove).toBe(false);
		expect(room.canSelect(idx(2, 1))).toBe(false);
	});

	test("a piece with a free square ahead can be selected", () => {
		const room = createRoom();
		expect(room.canSelect(FRONT)).toBe(true);
	});

	test("a piece boxed in by its own side can't be selected", () => {
		const room = createRoom();
		expect(room.canSelect(BLOCKED)).toBe(false);
	});

	test("the opponent's pieces can't be selected", () => {
		const room = createRoom();
		expect(room.canSelect(idx(2, 1))).toBe(false);
	});

	test("an uncrowned piece only steps forward onto free diagonals", () => {
		const room = createRoom();
		expect(room.movesFrom(FRONT)).toEqual([{ from: FRONT, to: FRONT_TO, captured: null }]);
	});

	test("clicking a movable piece selects it", async () => {
		const room = createRoom();
		await room.select(FRONT);
		expect(room.effectiveSelected).toBe(FRONT);
	});

	test("clicking a piece that can't move clears the selection", async () => {
		const room = createRoom();
		await room.select(FRONT);
		await room.select(BLOCKED);
		expect(room.effectiveSelected).toBeNull();
	});

	test("clicking a legal destination submits the move", async () => {
		const room = createRoom();
		await room.select(FRONT);
		await room.select(FRONT_TO);
		const move: CheckersMove = { kind: "checkers", from: FRONT, to: FRONT_TO };
		expect(submittedMoves()).toEqual([move]);
	});

	test("submitting a move clears the selection", async () => {
		const room = createRoom();
		await room.select(FRONT);
		await room.select(FRONT_TO);
		expect(room.selected).toBeNull();
	});

	test("clicking an unreachable square submits nothing", async () => {
		const room = createRoom();
		await room.select(FRONT);
		await room.select(idx(3, 2));
		expect(submittedMoves()).toEqual([]);
	});

	test("clicking out of turn neither selects nor submits", async () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: 1 }));
		await room.select(idx(2, 1));
		await room.select(idx(3, 0));
		expect(room.effectiveSelected).toBeNull();
		expect(submittedMoves()).toEqual([]);
	});

	test("when a capture is available only capturing pieces can be selected", () => {
		const room = createRoom(roomSnapshot(mustCapture));
		expect(room.canSelect(CAPTURER)).toBe(true);
		expect(room.canSelect(BYSTANDER)).toBe(false);
	});

	test("a capture submits the jump", async () => {
		const room = createRoom(roomSnapshot(mustCapture));
		await room.select(CAPTURER);
		await room.select(CAPTURE_TO);
		const move: CheckersMove = { kind: "checkers", from: CAPTURER, to: CAPTURE_TO };
		expect(submittedMoves()).toEqual([move]);
	});

	test("a piece mid multi-jump is selected without a click", () => {
		const room = createRoom(roomSnapshot(midChain));
		expect(room.effectiveSelected).toBe(CHAIN_FROM);
	});

	test("other pieces can't be selected mid multi-jump", async () => {
		const room = createRoom(roomSnapshot(midChain));
		await room.select(BYSTANDER);
		expect(room.effectiveSelected).toBe(CHAIN_FROM);
	});

	test("clicking the next landing square continues a multi-jump", async () => {
		const room = createRoom(roomSnapshot(midChain));
		await room.select(CHAIN_TO);
		const move: CheckersMove = { kind: "checkers", from: CHAIN_FROM, to: CHAIN_TO };
		expect(submittedMoves()).toEqual([move]);
	});

	test("a selection is dropped once the board changes and that piece can no longer move", async () => {
		const room = createRoom();
		await room.select(FRONT);

		const blocked = position([
			[FRONT, CYAN],
			[FRONT_TO, CYAN],
			[idx(3, 2), CYAN],
			[idx(0, 1), PINK]
		]);
		setQueryResult(api.models.rooms.index.get, roomSnapshot(blocked));

		expect(room.effectiveSelected).toBeNull();
	});

	test("the side to move with no legal moves loses", () => {
		const room = createRoom(roomSnapshot(position([[idx(0, 1), PINK]])));
		expect(room.winner).toBe("pink");
	});

	test("a game still in progress has no winner", () => {
		const room = createRoom();
		expect(room.winner).toBeNull();
	});

	test("cyan's seat burns clock first", () => {
		const room = createRoom();
		expect(room.activeSeat).toBe(0);
	});

	test("pink's seat burns clock on pink's turn", () => {
		const room = createRoom(roomSnapshot({ ...initial, turn: "pink" }));
		expect(room.activeSeat).toBe(1);
	});

	test("no seat burns clock once a side has run out of moves", () => {
		const room = createRoom(roomSnapshot(position([[idx(0, 1), PINK]])));
		expect(room.activeSeat).toBeNull();
	});

	test("no seat burns clock after a timeout", () => {
		const room = createRoom(roomSnapshot(initial, { game: { endedSeat: 0, reason: "timeout" } }));
		expect(room.activeSeat).toBeNull();
	});

	test.fails("no seat burns clock while waiting for an opponent", () => {
		// Bug: activeSeat ignores isWaitingForOpponent, contrary to Room's documented activeSeat contract.
		const room = createRoom(roomSnapshot(initial, { players: [ALICE, null] }));
		expect(room.clock.activeSeat).toBeNull();
	});

	test("a rematch clears the selection", async () => {
		const room = createRoom();
		await room.select(FRONT);
		await room.rematch();
		expect(room.selected).toBeNull();
	});

	test("a tic-tac-toe room loaded as checkers shows an empty board with no legal moves", () => {
		const room = createRoom(roomSnapshot(tictactoeEngine.createInitialState()));
		expect(room.wrongGameType).toBe(true);
		expect(room.board).toEqual([]);
		expect(room.legalMoves).toEqual([]);
	});
});
