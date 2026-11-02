import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import {
	checkersEngine,
	type CheckersState
} from "../../../../../convex/models/games/checkers/index.js";
import { idx } from "../../../../../convex/models/games/checkers/rules.js";
import {
	chessEngine,
	type ChessMove,
	type ChessState
} from "../../../../../convex/models/games/chess/index.js";
import type { GameMove, GameState, GameType } from "../../../../../convex/models/games/index.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import {
	ALICE,
	BOB,
	createRooted,
	deferred,
	historyOf,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryError,
	setQueryResult
} from "./fake-convex.svelte.js";
import { Room, roomPath, type ClientEngine } from "./room.svelte.js";

vi.mock("convex-svelte", () => import("./fake-convex.svelte.js"));

const clientEngines: Record<GameType, ClientEngine> = {
	tictactoe: {
		applyMove(state, seat, move) {
			if (state.kind !== "tictactoe" || move.kind !== "tictactoe") throw new Error("Wrong game");
			return tictactoeEngine.applyMove(state, seat, move);
		},
		status(state) {
			if (state.kind !== "tictactoe") throw new Error("Wrong game");
			return tictactoeEngine.status(state);
		}
	},
	checkers: {
		applyMove(state, seat, move) {
			if (state.kind !== "checkers" || move.kind !== "checkers") throw new Error("Wrong game");
			return checkersEngine.applyMove(state, seat, move);
		},
		status(state) {
			if (state.kind !== "checkers") throw new Error("Wrong game");
			return checkersEngine.status(state);
		}
	},
	chess: {
		applyMove(state, seat, move) {
			if (state.kind !== "chess" || move.kind !== "chess") throw new Error("Wrong game");
			return chessEngine.applyMove(state, seat, move);
		},
		status(state) {
			if (state.kind !== "chess") throw new Error("Wrong game");
			return chessEngine.status(state);
		}
	}
};

class SeatRoom extends Room {
	constructor(kind: GameType) {
		super(kind, clientEngines[kind], () => "ABCD");
	}

	get shownState() {
		return this.displayState;
	}

	get previousState() {
		return this.previousDisplayState;
	}

	move(move: GameMove = { kind: "tictactoe", boardIndex: 0, cellIndex: 0 }) {
		return this.submitMove(move);
	}
}

const NOW = 1_000_000;
const initial = tictactoeEngine.createInitialState();
const afterOne = tictactoeEngine.applyMove(initial, 0, {
	kind: "tictactoe",
	boardIndex: 0,
	cellIndex: 0
});
const afterTwo = tictactoeEngine.applyMove(afterOne, 1, {
	kind: "tictactoe",
	boardIndex: 1,
	cellIndex: 0
});
const afterThree = tictactoeEngine.applyMove(afterTwo, 0, {
	kind: "tictactoe",
	boardIndex: 2,
	cellIndex: 0
});

/** Cyan at (6,1) jumps pink at (5,2), then must jump pink at (3,4). */
const doubleJump: CheckersState = {
	kind: "checkers",
	board: Array.from({ length: 64 }, (_, index) => {
		if (index === idx(6, 1)) return { color: "cyan", king: false };
		if ([idx(5, 2), idx(3, 4), idx(0, 7)].includes(index)) return { color: "pink", king: false };
		return null;
	}),
	turn: "cyan",
	mustContinueFrom: null
};

/** Each position after the from-to moves, played by alternating seats from the start. */
function chessLine(...moves: string[]): ChessState[] {
	let state = chessEngine.createInitialState();
	return moves.map((text, ply) => {
		const move: ChessMove = { kind: "chess", from: text.slice(0, 2), to: text.slice(2) };
		state = chessEngine.applyMove(state, ply % 2, move);
		return state;
	});
}

let destroy: () => void;

function createRoom(kind: GameType = "tictactoe") {
	const rooted = createRooted(() => new SeatRoom(kind));
	destroy = () => {
		rooted.instance.dispose();
		rooted.destroy();
	};
	return rooted.instance;
}

function playedThrough(states: GameState[]) {
	setQueryResult(api.models.rooms.index.get, roomSnapshot(states[states.length - 1]));
	setQueryResult(api.models.games.index.history, historyOf(states));
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	destroy();
	resetConvex();
	vi.useRealTimers();
});

describe("Room", () => {
	test("the room is loading until the room query resolves", () => {
		const room = createRoom();
		expect(room.isLoading).toBe(true);

		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		expect(room.isLoading).toBe(false);
	});

	test("both seats read as empty and the viewer unseated while loading", () => {
		const room = createRoom();
		expect(room.players).toEqual([null, null]);
		expect(room.myIndex).toBeNull();
	});

	test("myIndex is the viewer's seat", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { myIndex: 1 }));
		expect(room.myIndex).toBe(1);
	});

	test("myIndex is null for a spectator", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { myIndex: null }));
		expect(room.myIndex).toBeNull();
	});

	test("the room waits for an opponent while a seat is empty", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { players: [ALICE, null] }));
		expect(room.isWaitingForOpponent).toBe(true);
	});

	test("the room stops waiting once both seats are filled", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		expect(room.isWaitingForOpponent).toBe(false);
	});

	test("it is the viewer's turn when their seat is the active seat", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(afterOne, { myIndex: 1 }));
		expect(room.isMyTurn).toBe(true);
	});

	test("it isn't the viewer's turn while the opponent's seat is active", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(afterOne, { myIndex: 0 }));
		expect(room.isMyTurn).toBe(false);
	});

	test("a spectator never has the turn", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { myIndex: null }));
		expect(room.isMyTurn).toBe(false);
	});

	test("the host has no turn while waiting for an opponent", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { players: [ALICE, null] }));
		expect(room.isMyTurn).toBe(false);
	});

	test("isRoomClosed follows the room's closed status", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		expect(room.isRoomClosed).toBe(false);

		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { status: "closed" }));
		expect(room.isRoomClosed).toBe(true);
	});

	test("a room code that belongs to another game is flagged as the wrong game type", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { type: "checkers" }));
		expect(room.wrongGameType).toBe(true);
	});

	test("a missing room is not mistaken for the wrong game type", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, null);
		expect(room.wrongGameType).toBe(false);
	});

	test("the round defaults to a live round 1 while loading", () => {
		const room = createRoom();
		expect(room.game).toEqual({
			round: 1,
			latestRound: 1,
			isLive: true,
			endedSeat: null,
			reason: null
		});
	});

	test("a pinned past round reports itself as not live, with the latest round alongside", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { game: { round: 2, latestRound: 4, isLive: false } })
		);
		expect(room.game.round).toBe(2);
		expect(room.game.latestRound).toBe(4);
		expect(room.game.isLive).toBe(false);
	});

	test("a resigned round reports which seat ended it and why", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { game: { endedSeat: 1, reason: "resign" } })
		);
		expect(room.game.endedSeat).toBe(1);
		expect(room.game.reason).toBe("resign");
	});

	test("the opponent shows as disconnected after 30s without a heartbeat", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { players: [ALICE, { ...BOB, seenAt: NOW - 31_000 }] })
		);
		expect(room.opponentDisconnected).toBe(true);
	});

	test("an opponent who heartbeated recently is connected", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { players: [ALICE, { ...BOB, seenAt: NOW - 5_000 }] })
		);
		expect(room.opponentDisconnected).toBe(false);
	});

	test("an opponent goes disconnected as time passes without a heartbeat", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { players: [ALICE, { ...BOB, seenAt: NOW }] })
		);
		vi.advanceTimersByTime(31_000);
		expect(room.opponentDisconnected).toBe(true);
	});

	test("an opponent who never heartbeated isn't shown as disconnected", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		vi.advanceTimersByTime(60_000);
		expect(room.opponentDisconnected).toBe(false);
	});

	test("a spectator sees no one as disconnected", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, {
				myIndex: null,
				players: [
					{ ...ALICE, seenAt: NOW - 60_000 },
					{ ...BOB, seenAt: NOW - 60_000 }
				]
			})
		);
		expect(room.opponentDisconnected).toBe(false);
	});

	test("the clock shows banked time while no countdown has started", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [45_000, 50_000], turnedAt: null } })
		);
		vi.advanceTimersByTime(5_000);
		expect(room.clock.remaining).toEqual([45_000, 50_000]);
	});

	test("only the active seat's clock ticks down", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(afterOne, { clock: { remaining: [45_000, 50_000], turnedAt: NOW } })
		);
		vi.advanceTimersByTime(5_000);
		expect(room.clock.remaining).toEqual([45_000, 45_000]);
		expect(room.clock.activeSeat).toBe(1);
	});

	test("a running clock never shows less than zero", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [2_000, 50_000], turnedAt: NOW } })
		);
		vi.advanceTimersByTime(5_000);
		expect(room.clock.remaining[0]).toBe(0);
	});

	test("the clock display freezes while reviewing history", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(afterTwo, { clock: { remaining: [45_000, 50_000], turnedAt: NOW } })
		);
		setQueryResult(api.models.games.index.history, historyOf([afterOne, afterTwo]));

		room.stepBack();
		flushSync();
		vi.advanceTimersByTime(5_000);

		expect(room.clock.remaining).toEqual([45_000, 50_000]);
		expect(room.clock.activeSeat).toBeNull();
	});

	test("the clock resumes from live time when returning from history", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(afterTwo, { clock: { remaining: [45_000, 50_000], turnedAt: NOW } })
		);
		setQueryResult(api.models.games.index.history, historyOf([afterOne, afterTwo]));

		room.stepBack();
		flushSync();
		vi.advanceTimersByTime(5_000);
		room.jumpToLatest();
		flushSync();

		expect(room.clock.remaining).toEqual([40_000, 50_000]);
	});

	test("the timeout is claimed once the active seat's clock runs out", () => {
		createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [1_000, 50_000], turnedAt: NOW } })
		);

		vi.advanceTimersByTime(2_000);
		flushSync();

		expect(mutationFor(api.models.games.index.timeout)).toHaveBeenCalledWith({ code: "ABCD" });
	});

	test("no timeout is claimed while the active seat has time left", () => {
		createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [10_000, 50_000], turnedAt: NOW } })
		);

		vi.advanceTimersByTime(2_000);
		flushSync();

		expect(mutationFor(api.models.games.index.timeout)).not.toHaveBeenCalled();
	});

	test.fails("a timeout claim the server ignores is not immediately re-sent", async () => {
		// Bug: the claim effect re-runs as soon as #isClaimingTimeout resets, so an unchanged server state retries forever.
		createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [1_000, 50_000], turnedAt: NOW } })
		);
		vi.advanceTimersByTime(2_000);
		flushSync();

		for (let turn = 0; turn < 3; turn++) {
			await Promise.resolve();
			await Promise.resolve();
			flushSync();
		}

		expect(mutationFor(api.models.games.index.timeout)).toHaveBeenCalledTimes(1);
	});

	test("the live position counts as the latest move", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);
		expect(room.isViewingHistory).toBe(false);
		expect(room.viewedMoveNumber).toBe(3);
		expect(room.historyLength).toBe(3);
	});

	test("stepping back shows the previous move's snapshot", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);

		room.stepBack();

		expect(room.isViewingHistory).toBe(true);
		expect(room.viewedMoveNumber).toBe(2);
		expect(room.shownState).toEqual(afterTwo);
	});

	test("stepping back stops at the first move", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);

		room.stepBack();
		room.stepBack();
		room.stepBack();
		room.stepBack();

		expect(room.viewedMoveNumber).toBe(1);
		expect(room.shownState).toEqual(afterOne);
	});

	test.fails("stepping back when the only move is the live one stays live", () => {
		// Bug: with one move, stepBack clamps the cursor to 0 (the live move) but still enters history mode.
		const room = createRoom();
		playedThrough([afterOne]);

		room.stepBack();

		expect(room.isViewingHistory).toBe(false);
	});

	test("stepping back before any move is played does nothing", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		setQueryResult(api.models.games.index.history, []);

		room.stepBack();

		expect(room.isViewingHistory).toBe(false);
		expect(room.viewedMoveNumber).toBe(0);
	});

	test("stepping forward onto the latest move returns to live", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);

		room.stepBack();
		room.stepBack();
		room.stepForward();
		expect(room.viewedMoveNumber).toBe(2);

		room.stepForward();
		expect(room.isViewingHistory).toBe(false);
		expect(room.shownState).toEqual(afterThree);
	});

	test("stepping forward while live does nothing", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo]);

		room.stepForward();

		expect(room.isViewingHistory).toBe(false);
		expect(room.viewedMoveNumber).toBe(2);
	});

	test("jumping to the first move shows the first snapshot", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);

		room.jumpToFirst();

		expect(room.viewedMoveNumber).toBe(1);
		expect(room.shownState).toEqual(afterOne);
	});

	test("jumping to the latest move returns to live", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);

		room.jumpToFirst();
		room.jumpToLatest();

		expect(room.isViewingHistory).toBe(false);
	});

	test("a round reset that clears history drops the viewer back to live", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);
		room.stepBack();
		flushSync();

		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		setQueryResult(api.models.games.index.history, []);
		flushSync();

		expect(room.isViewingHistory).toBe(false);
		expect(room.shownState).toEqual(initial);
	});

	test("a rejected move surfaces the server's message", async () => {
		const room = createRoom();
		mutationFor(api.models.rooms.index.play).mockRejectedValueOnce(new Error("Not your turn"));

		await room.move();

		expect(room.error).toBe("Not your turn");
	});

	test("a rejection that isn't an Error falls back to a generic message", async () => {
		const room = createRoom();
		mutationFor(api.models.rooms.index.play).mockRejectedValueOnce("offline");

		await room.move();

		expect(room.error).toBe("Something went wrong");
	});

	test("a successful move clears the previous error", async () => {
		const room = createRoom();
		mutationFor(api.models.rooms.index.play).mockRejectedValueOnce(new Error("Not your turn"));
		await room.move();

		await room.move();

		expect(room.error).toBeNull();
	});

	test("a failed resign surfaces the server's message", async () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		mutationFor(api.models.games.index.resign).mockRejectedValueOnce(
			new Error("This room is no longer active")
		);

		await room.resign();

		expect(room.error).toBe("This room is no longer active");
	});

	test("a failed abandon surfaces the server's message", async () => {
		const room = createRoom();
		mutationFor(api.models.rooms.index.abandon).mockRejectedValueOnce(new Error("Room not found"));

		await room.abandon();

		expect(room.error).toBe("Room not found");
	});

	test("a failed trash-talk surfaces the server's message", async () => {
		const room = createRoom();
		mutationFor(api.models.players.index.trashtalk).mockRejectedValueOnce(
			new Error("You are not in this room")
		);

		await room.trashtalk("1f525");

		expect(room.error).toBe("You are not in this room");
	});

	test("a lost timeout race is not shown to the viewer", async () => {
		const room = createRoom();
		mutationFor(api.models.games.index.timeout).mockRejectedValueOnce(new Error("Game not found"));

		await room.timeout();

		expect(room.error).toBeNull();
	});

	test("a rematch returns the viewer to the live position", async () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);
		room.stepBack();

		await room.rematch();

		expect(room.isViewingHistory).toBe(false);
	});

	test("a rematch names the round it follows", async () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(afterThree, { game: { round: 2, latestRound: 2 } })
		);

		await room.rematch();

		expect(mutationFor(api.models.rooms.index.rematch)).toHaveBeenCalledWith({
			code: "ABCD",
			round: 2
		});
	});

	test("a rematch from a pinned past round does nothing", async () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(afterThree, { game: { round: 1, latestRound: 2, isLive: false } })
		);
		setQueryResult(api.models.games.index.history, historyOf([afterOne, afterTwo, afterThree]));
		room.stepBack();

		await room.rematch();

		expect(room.isViewingHistory).toBe(true);
	});
	test("a pending move shows before the server answers", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.move();

		expect(room.shownState).toEqual(afterOne);
		expect(room.activeSeat).toBe(1);
		expect(room.isMyTurn).toBe(false);
	});

	test("a spectator's room shows only the server state", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { myIndex: null }));
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.move();

		expect(room.shownState).toEqual(initial);
	});

	test("a pending move is confirmed once the room state reflects it", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		const held = deferred();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(held.promise);
		void room.move();

		setQueryResult(api.models.rooms.index.get, roomSnapshot(afterOne));
		flushSync();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(afterTwo));
		flushSync();

		expect(room.shownState).toEqual(afterTwo);
		expect(room.isMyTurn).toBe(true);
	});

	test("a pending chess move is confirmed by a server state with the same FEN", () => {
		const room = createRoom("chess");
		const [e4, e5] = chessLine("e2e4", "e7e5");
		setQueryResult(api.models.rooms.index.get, roomSnapshot(chessEngine.createInitialState()));
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);
		void room.move({ kind: "chess", from: "e2", to: "e4" });

		setQueryResult(api.models.rooms.index.get, roomSnapshot(e4));
		flushSync();
		expect(room.shownState).toEqual(e4);
		expect(room.activeSeat).toBe(1);

		setQueryResult(api.models.rooms.index.get, roomSnapshot(e5));
		flushSync();
		expect(room.shownState).toEqual(e5);
		expect(room.isMyTurn).toBe(true);
	});

	test("a resolved request clears the pending move", async () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		const held = deferred();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(held.promise);
		const moving = room.move();

		setQueryResult(api.models.rooms.index.get, roomSnapshot(afterOne));
		held.resolve(null);
		await moving;
		setQueryResult(api.models.rooms.index.get, roomSnapshot(afterTwo));

		expect(room.shownState).toEqual(afterTwo);
	});

	test("a request that leaves the state unchanged clears the move without an error", async () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		const held = deferred();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(held.promise);
		const moving = room.move();

		held.resolve(null);
		await moving;

		expect(room.shownState).toEqual(initial);
		expect(room.isMyTurn).toBe(true);
		expect(room.error).toBeNull();
		expect(room.rejection).toBeNull();
	});

	test("a room update with an unchanged game state keeps the pending move", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);
		void room.move();

		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { players: [ALICE, { ...BOB, seenAt: NOW }] })
		);
		flushSync();

		expect(room.shownState).toEqual(afterOne);
	});

	test("a rejected pending move rolls back without setting the error", async () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		const held = deferred();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(held.promise);
		const moving = room.move();

		held.reject(new Error("This round is already over"));
		await moving;

		expect(room.shownState).toEqual(initial);
		expect(room.isMyTurn).toBe(true);
		expect(room.rejection?.message).toBe("Move not accepted");
		expect(room.error).toBeNull();
	});

	test("each rejected move gets its own rejection", async () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		const play = mutationFor(api.models.rooms.index.play);
		play.mockRejectedValueOnce(new Error("Time's up"));
		await room.move();
		const first = room.rejection;

		play.mockRejectedValueOnce(new Error("Time's up"));
		await room.move();

		expect(room.rejection).not.toBeNull();
		expect(room.rejection?.id).not.toBe(first?.id);
	});

	test("rejecting a pending jump also drops the jumps queued after it", async () => {
		const room = createRoom("checkers");
		setQueryResult(api.models.rooms.index.get, roomSnapshot(doubleJump));
		const first = deferred();
		const second = deferred();
		const play = mutationFor(api.models.rooms.index.play);
		play.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

		const firstJump = room.move({ kind: "checkers", from: idx(6, 1), to: idx(4, 3) });
		const secondJump = room.move({ kind: "checkers", from: idx(4, 3), to: idx(2, 5) });
		expect(room.shownState).toMatchObject({ mustContinueFrom: null, turn: "pink" });

		first.reject(new Error("Not your turn"));
		await firstJump;
		const rejection = room.rejection;
		second.reject(new Error("Not your turn"));
		await secondJump;

		expect(room.shownState).toEqual(doubleJump);
		expect(room.rejection).toBe(rejection);
	});

	test("a new round drops pending moves from the earlier round without a rejection", async () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		const held = deferred();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(held.promise);
		const moving = room.move();

		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { game: { round: 2, latestRound: 2 } })
		);
		flushSync();
		expect(room.shownState).toEqual(initial);

		held.reject(new Error("This round is already over"));
		await moving;

		expect(room.rejection).toBeNull();
	});

	test("a rematch drops pending moves", async () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		const held = deferred();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(held.promise);
		const moving = room.move();

		await room.rematch();
		held.reject(new Error("This round is already over"));
		await moving;

		expect(room.shownState).toEqual(initial);
		expect(room.rejection).toBeNull();
	});

	test("history ignores a pending move, and returning to live shows it again", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo]);
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);
		void room.move({ kind: "tictactoe", boardIndex: 2, cellIndex: 0 });

		room.stepBack();
		expect(room.shownState).toEqual(afterOne);

		room.jumpToLatest();
		expect(room.shownState).toEqual(afterThree);
	});

	test("a pending move freezes the viewer's clock and starts the opponent's", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [60_000, 60_000], turnedAt: NOW - 10_000 } })
		);
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.move();
		vi.advanceTimersByTime(5_000);

		expect(room.clock.remaining).toEqual([50_000, 55_000]);
		expect(room.clock.activeSeat).toBe(1);
	});

	test("a move queued between clock ticks never raises the opponent's clock above its banked time", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [60_000, 60_000], turnedAt: NOW } })
		);
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);
		vi.setSystemTime(NOW + 500);

		void room.move();

		expect(room.clock.remaining[1]).toBe(60_000);
	});

	test("the server's clock replaces the local handoff once the move is confirmed", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [60_000, 60_000], turnedAt: NOW - 10_000 } })
		);
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);
		void room.move();
		vi.advanceTimersByTime(5_000);

		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(afterOne, { clock: { remaining: [49_000, 60_000], turnedAt: NOW + 5_000 } })
		);
		flushSync();

		expect(room.clock.remaining).toEqual([49_000, 60_000]);
	});

	test("the opponent's locally ticking clock running out claims no timeout", () => {
		const room = createRoom();
		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(initial, { clock: { remaining: [60_000, 1_000], turnedAt: NOW } })
		);
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.move();
		vi.advanceTimersByTime(3_000);
		flushSync();

		expect(room.clock.remaining[1]).toBe(0);
		expect(mutationFor(api.models.games.index.timeout)).not.toHaveBeenCalled();
	});

	test("the confirmed turn stays with the viewer through a pending move and its rejection", async () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		const held = deferred();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(held.promise);
		const moving = room.move();
		expect(room.isMyTurnConfirmed).toBe(true);

		held.reject(new Error("Not your turn"));
		await moving;

		expect(room.isMyTurnConfirmed).toBe(true);
	});

	test("the confirmed turn passes once the server reflects the move", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);
		void room.move();

		setQueryResult(api.models.rooms.index.get, roomSnapshot(afterOne));

		expect(room.isMyTurnConfirmed).toBe(false);
	});

	test("the live outcome follows a pending move", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.move();

		expect(room.liveOutcome).toEqual({ turnIndex: 1, winnerIndex: null, isOver: false });
	});

	test("the live outcome ignores the scrub cursor", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);

		room.stepBack();

		expect(room.liveOutcome).toEqual({ turnIndex: 1, winnerIndex: null, isOver: false });
	});

	test("there is no live outcome while loading", () => {
		const room = createRoom();
		expect(room.liveOutcome).toBeNull();
	});

	test("a failed room query is reported as the load error", () => {
		const room = createRoom();
		setQueryError(api.models.rooms.index.get, new Error("Server Error"));

		expect(room.loadError?.message).toBe("Server Error");
		expect(room.isLoading).toBe(false);
	});

	test("a loaded room has no load error", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		expect(room.loadError).toBeNull();
	});

	test("the previous position is the move before the live one", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);
		expect(room.previousState).toEqual(afterTwo);
	});

	test("the previous position is the latest move while history is one push behind", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(afterThree));
		setQueryResult(api.models.games.index.history, historyOf([afterOne, afterTwo]));
		expect(room.previousState).toEqual(afterTwo);
	});

	test("a chess board that repeats is told apart by its FEN", () => {
		const room = createRoom("chess");
		const line = chessLine("g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6");
		setQueryResult(api.models.rooms.index.get, roomSnapshot(line[5]));
		setQueryResult(api.models.games.index.history, historyOf(line.slice(0, 5)));
		expect(room.previousState).toEqual(line[4]);
	});

	test("the previous position of a pending move is the position it was played on", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		setQueryResult(api.models.games.index.history, []);
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.move();

		expect(room.previousState).toEqual(initial);
	});

	test("while scrubbing, the previous position is the move before the shown one", () => {
		const room = createRoom();
		playedThrough([afterOne, afterTwo, afterThree]);

		room.stepBack();

		expect(room.previousState).toEqual(afterOne);
	});

	test("the first move has no previous position", () => {
		const room = createRoom();
		playedThrough([afterOne]);
		expect(room.previousState).toBeNull();
	});

	test("rounds lists this room's rounds from the viewer's history", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial));
		setQueryResult(api.models.rooms.index.history, [
			{
				code: "WXYZ",
				type: "checkers",
				status: "closed",
				opponentName: "Bob Baker",
				games: [{ round: 1, createdAt: 3, result: "loss", mmr: -8 }]
			},
			{
				code: "ABCD",
				type: "tictactoe",
				status: "active",
				opponentName: "Bob Baker",
				games: [
					{ round: 2, createdAt: 2, result: "playing", mmr: null },
					{ round: 1, createdAt: 1, result: "win", mmr: 8 }
				]
			}
		]);

		expect(room.rounds).toEqual([
			{ round: 2, result: "playing", mmr: null },
			{ round: 1, result: "win", mmr: 8 }
		]);
	});

	test("a spectator has no rounds", () => {
		const room = createRoom();
		setQueryResult(api.models.rooms.index.get, roomSnapshot(initial, { myIndex: null }));
		setQueryResult(api.models.rooms.index.history, [
			{
				code: "ABCD",
				type: "tictactoe",
				status: "active",
				opponentName: "Bob Baker",
				games: [{ round: 1, createdAt: 1, result: "win", mmr: 8 }]
			}
		]);

		expect(room.rounds).toEqual([]);
	});
});

describe("roomPath", () => {
	test("a round goes after the code", () => {
		expect(roomPath("checkers", "ABCD", 2)).toBe("/checkers/ABCD/2");
	});

	test("without a round the path is the live room", () => {
		expect(roomPath("checkers", "ABCD")).toBe("/checkers/ABCD");
	});
});
