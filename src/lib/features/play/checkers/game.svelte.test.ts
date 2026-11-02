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
	deferred,
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

/** Cyan at (5,2) jumps pink at (4,3), then must jump pink at (2,5) to land on (1,6). */
const doubleJump = position([
	[CAPTURER, CYAN],
	[idx(4, 3), PINK],
	[idx(2, 5), PINK],
	[BYSTANDER, CYAN],
	[idx(0, 1), PINK]
]);

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

	test("a move shows the piece on its new square while the server has not answered", () => {
		const room = createRoom();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.select(FRONT);
		void room.select(FRONT_TO);

		expect(room.board[FRONT]).toBeNull();
		expect(room.board[FRONT_TO]).toEqual(CYAN);
		expect(room.turn).toBe("pink");
		expect(room.activeSeat).toBe(1);
		expect(room.canMove).toBe(false);
	});

	test("a pending capture that must continue keeps the piece selected", () => {
		const room = createRoom(roomSnapshot(doubleJump));
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.select(CAPTURER);
		void room.select(CAPTURE_TO);

		expect(room.board[idx(4, 3)]).toBeNull();
		expect(room.mustContinueFrom).toBe(CAPTURE_TO);
		expect(room.effectiveSelected).toBe(CAPTURE_TO);
		expect(room.canMove).toBe(true);
		expect(room.legalMoves).toEqual([{ from: CAPTURE_TO, to: CHAIN_TO, captured: idx(2, 5) }]);
	});

	test("the second jump of a pending capture is sent after the first", () => {
		const room = createRoom(roomSnapshot(doubleJump));
		const play = mutationFor(api.models.rooms.index.play);
		play.mockReturnValueOnce(deferred().promise).mockReturnValueOnce(deferred().promise);

		void room.select(CAPTURER);
		void room.select(CAPTURE_TO);
		void room.select(CHAIN_TO);

		const firstJump: CheckersMove = { kind: "checkers", from: CAPTURER, to: CAPTURE_TO };
		const secondJump: CheckersMove = { kind: "checkers", from: CAPTURE_TO, to: CHAIN_TO };
		expect(submittedMoves()).toEqual([firstJump, secondJump]);
		expect(room.board[CHAIN_TO]).toEqual(CYAN);
		expect(room.turn).toBe("pink");
	});

	test("rejecting the first jump of a capture drops both jumps", async () => {
		const room = createRoom(roomSnapshot(doubleJump));
		const first = deferred();
		const second = deferred();
		const play = mutationFor(api.models.rooms.index.play);
		play.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		void room.select(CAPTURER);
		const firstJump = room.select(CAPTURE_TO);
		const secondJump = room.select(CHAIN_TO);

		first.reject(new Error("Not your turn"));
		await firstJump;
		second.reject(new Error("Not your turn"));
		await secondJump;

		expect(room.board).toEqual(doubleJump.board);
		expect(room.mustContinueFrom).toBeNull();
		expect(room.canSelect(CAPTURER)).toBe(true);
		expect(room.rejection?.message).toBe("Move not accepted");
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

	test("the first move's last move is its step from the starting position", () => {
		const first = checkersEngine.applyMove(initial, 0, {
			kind: "checkers",
			from: FRONT,
			to: FRONT_TO
		});
		const room = createRoom(roomSnapshot(first));
		setQueryResult(api.models.games.index.history, historyOf([first]));

		expect(room.lastMove).toEqual({ from: FRONT, to: FRONT_TO, seat: 0 });
	});

	test("a step is the last move of the seat that made it", () => {
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

		expect(room.lastMove).toEqual({ from: idx(2, 1), to: idx(3, 0), seat: 1 });
	});

	test("a jump's last move is its from and landing squares, not the captured one", () => {
		const jumped = checkersEngine.applyMove(mustCapture, 0, {
			kind: "checkers",
			from: CAPTURER,
			to: CAPTURE_TO
		});
		const room = createRoom(roomSnapshot(jumped));
		setQueryResult(api.models.games.index.history, historyOf([mustCapture, jumped]));

		expect(room.lastMove).toEqual({ from: CAPTURER, to: CAPTURE_TO, seat: 0 });
	});

	test("a multi-jump's last move is its last hop", () => {
		const hop = checkersEngine.applyMove(doubleJump, 0, {
			kind: "checkers",
			from: CAPTURER,
			to: idx(3, 4)
		});
		const landed = checkersEngine.applyMove(hop, 0, {
			kind: "checkers",
			from: idx(3, 4),
			to: idx(1, 6)
		});
		const room = createRoom(roomSnapshot(landed));
		setQueryResult(api.models.games.index.history, historyOf([doubleJump, hop, landed]));

		expect(room.lastMove).toEqual({ from: idx(3, 4), to: idx(1, 6), seat: 0 });
	});

	test("the starting position has no last move", () => {
		const room = createRoom();
		setQueryResult(api.models.games.index.history, []);
		expect(room.lastMove).toBeNull();
	});

	test("the viewer must capture when every legal move on their turn is a capture", () => {
		const room = createRoom(roomSnapshot(mustCapture));
		expect(room.mustCapture).toBe(true);
	});

	test("the viewer needn't capture when a plain step is legal", () => {
		const room = createRoom();
		expect(room.mustCapture).toBe(false);
	});

	test("a forced capture on the opponent's turn isn't the viewer's", () => {
		const room = createRoom(roomSnapshot(mustCapture, { myIndex: 1 }));
		expect(room.mustCapture).toBe(false);
	});

	test("a spectator is never told to capture", () => {
		const room = createRoom(roomSnapshot(mustCapture, { myIndex: null }));
		expect(room.mustCapture).toBe(false);
	});

	test("the forced capture follows the live turn while scrubbing", () => {
		const room = createRoom(roomSnapshot(mustCapture));
		setQueryResult(api.models.games.index.history, historyOf([initial, mustCapture]));

		room.stepBack();

		expect(room.mustCapture).toBe(true);
	});

	test("a piece that can jump can capture, and one that can step can move", () => {
		const room = createRoom();
		expect(room.abilityOf(FRONT)).toBe("move");

		setQueryResult(api.models.rooms.index.get, roomSnapshot(mustCapture));
		expect(room.abilityOf(CAPTURER)).toBe("capture");
	});

	test("a piece with no legal move this turn has no ability", () => {
		const room = createRoom(roomSnapshot(mustCapture));
		expect(room.abilityOf(BYSTANDER)).toBeNull();
		expect(room.abilityOf(idx(4, 3))).toBeNull();
	});

	test("pieces have no ability off the viewer's turn", () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: 1 }));
		expect(room.abilityOf(idx(2, 1))).toBeNull();
	});
});
