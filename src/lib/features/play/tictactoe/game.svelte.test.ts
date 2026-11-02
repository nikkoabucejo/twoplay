import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import {
	tictactoeEngine,
	type TictactoeMove,
	type TictactoeState
} from "../../../../../convex/models/games/tictactoe/index.js";
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
import { TictactoeRoom } from "./game.svelte.js";
import type { Board } from "./types.js";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));

const EMPTY: Board = Array(9).fill(null);
const DRAWN: Board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
const WON_BY_X: Board = ["X", "X", "X", "O", "O", null, null, null, null];

const initial = tictactoeEngine.createInitialState();

function played(...moves: [boardIndex: number, cellIndex: number][]): TictactoeState {
	return moves.reduce(
		(state, [boardIndex, cellIndex], turn) =>
			tictactoeEngine.applyMove(state, turn % 2, { kind: "tictactoe", boardIndex, cellIndex }),
		initial
	);
}

function withBoards(
	boards: Board[],
	lastBoardBySymbol?: TictactoeState["lastBoardBySymbol"]
): TictactoeState {
	return { kind: "tictactoe", boards, lastBoardBySymbol };
}

let destroy: () => void;

function createRoom(snapshot = roomSnapshot(initial)) {
	setQueryResult(api.models.rooms.index.get, snapshot);
	const rooted = createRooted(() => new TictactoeRoom(() => "ABCD"));
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

describe("TictactoeRoom", () => {
	test("X moves first", () => {
		const room = createRoom();
		expect(room.turn).toBe("X");
	});

	test("seat 0 plays X", () => {
		const room = createRoom();
		expect(room.mySymbol).toBe("X");
	});

	test("seat 1 plays O", () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: 1 }));
		expect(room.mySymbol).toBe("O");
	});

	test("a spectator has no symbol and can't play", () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: null }));
		expect(room.mySymbol).toBeNull();
		expect(room.canPlay(0)).toBe(false);
	});

	test("the turn passes to O after X places a mark", () => {
		const room = createRoom(roomSnapshot(played([4, 4])));
		expect(room.turn).toBe("O");
	});

	test("the player to move can play an open board", () => {
		const room = createRoom();
		expect(room.canPlay(0)).toBe(true);
	});

	test("a player can't play out of turn", () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: 1 }));
		expect(room.canPlay(0)).toBe(false);
	});

	test("the host can't play while waiting for an opponent", () => {
		const room = createRoom(roomSnapshot(initial, { players: [ALICE, null] }));
		expect(room.canPlay(0)).toBe(false);
	});

	test("nobody can play while reviewing history", () => {
		const moves: [number, number][] = [
			[0, 0],
			[1, 0],
			[2, 0],
			[3, 0]
		];
		const states = moves.map((_, i) => played(...moves.slice(0, i + 1)));
		const room = createRoom(roomSnapshot(states[3]));
		setQueryResult(api.models.games.index.history, historyOf(states));
		expect(room.canPlay(5)).toBe(true);

		room.stepBack();
		room.stepBack();

		expect(room.turn).toBe("X");
		expect(room.canPlay(5)).toBe(false);
	});

	test("nobody can play on a pinned past round", () => {
		const room = createRoom(
			roomSnapshot(initial, { game: { round: 1, latestRound: 2, isLive: false } })
		);
		expect(room.canPlay(0)).toBe(false);
	});

	test("nobody can play once the round ended on a timeout", () => {
		const room = createRoom(roomSnapshot(initial, { game: { endedSeat: 1, reason: "timeout" } }));
		expect(room.canPlay(0)).toBe(false);
	});

	test("a board that is already won can't be played", () => {
		const boards = [WON_BY_X, ...Array(8).fill(EMPTY)];
		const room = createRoom(roomSnapshot(withBoards(boards)));
		expect(room.statuses[0].status).toBe("won");
		expect(room.canPlay(0)).toBe(false);
	});

	test("a player can't repeat the board they played last turn while another is open", () => {
		const room = createRoom(roomSnapshot(played([0, 0], [4, 0])));
		expect(room.isForbidden(0)).toBe(true);
		expect(room.canPlay(0)).toBe(false);
		expect(room.canPlay(1)).toBe(true);
	});

	test("a player may repeat their last board when it's the only one still open", () => {
		const lastOpen: Board = ["X", "O", null, null, null, null, null, null, null];
		const state = withBoards([lastOpen, ...Array(8).fill(DRAWN)], { X: 0, O: null });
		const room = createRoom(roomSnapshot(state));
		expect(room.turn).toBe("X");
		expect(room.isForbidden(0)).toBe(false);
		expect(room.canPlay(0)).toBe(true);
	});

	test("the restricted board follows whoever is to move", () => {
		const room = createRoom(roomSnapshot(played([0, 0], [4, 0], [1, 0])));
		expect(room.turn).toBe("O");
		expect(room.activeLastBoard).toBe(4);
	});

	test("winning three boards in a row wins the room", () => {
		const boards = [WON_BY_X, WON_BY_X, WON_BY_X, ...Array(6).fill(EMPTY)];
		const room = createRoom(roomSnapshot(withBoards(boards)));
		expect(room.winner).toBe("X");
		expect(room.winningLine).toEqual([0, 1, 2]);
		expect(room.isOver).toBe(true);
	});

	test("a single won board doesn't end the room", () => {
		const room = createRoom(roomSnapshot(withBoards([WON_BY_X, ...Array(8).fill(EMPTY)])));
		expect(room.winner).toBeNull();
		expect(room.isOver).toBe(false);
	});

	test("every board drawn ends the room with no winner", () => {
		const room = createRoom(roomSnapshot(withBoards(Array(9).fill(DRAWN))));
		expect(room.winner).toBeNull();
		expect(room.isOver).toBe(true);
	});

	test("only the cells of a board's winning line are highlighted", () => {
		const room = createRoom(roomSnapshot(withBoards([WON_BY_X, ...Array(8).fill(EMPTY)])));
		expect([0, 1, 2].map((cell) => room.isWinningCell(0, cell))).toEqual([true, true, true]);
		expect(room.isWinningCell(0, 3)).toBe(false);
		expect(room.isWinningCell(1, 0)).toBe(false);
	});

	test("playing an open cell on your turn submits the move", async () => {
		const room = createRoom();
		await room.play(4, 8);
		const move: TictactoeMove = { kind: "tictactoe", boardIndex: 4, cellIndex: 8 };
		expect(submittedMoves()).toEqual([move]);
	});

	test("a move shows its mark while the server has not answered", () => {
		const room = createRoom();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.play(4, 8);

		expect(room.boards[4][8]).toBe("X");
		expect(room.turn).toBe("O");
		expect(room.activeSeat).toBe(1);
	});

	test("no board can be played while a move is pending", () => {
		const room = createRoom();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.play(4, 8);

		expect(room.boards.map((_, boardIndex) => room.canPlay(boardIndex))).toEqual(
			Array(9).fill(false)
		);
	});

	test("playing an occupied cell submits nothing", async () => {
		const room = createRoom(roomSnapshot(played([0, 0], [1, 0])));
		await room.play(1, 0);
		expect(submittedMoves()).toEqual([]);
	});

	test("playing out of turn submits nothing", async () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: 1 }));
		await room.play(0, 0);
		expect(submittedMoves()).toEqual([]);
	});

	test("playing your last board while another is open submits nothing", async () => {
		const room = createRoom(roomSnapshot(played([0, 0], [4, 0])));
		await room.play(0, 1);
		expect(submittedMoves()).toEqual([]);
	});

	test("X's seat burns clock first", () => {
		const room = createRoom();
		expect(room.activeSeat).toBe(0);
	});

	test("O's seat burns clock after X moves", () => {
		const room = createRoom(roomSnapshot(played([0, 0])));
		expect(room.activeSeat).toBe(1);
	});

	test("no seat burns clock once the room is won", () => {
		const boards = [WON_BY_X, WON_BY_X, WON_BY_X, ...Array(6).fill(EMPTY)];
		const room = createRoom(roomSnapshot(withBoards(boards)));
		expect(room.activeSeat).toBeNull();
	});

	test("no seat burns clock after a resignation", () => {
		const room = createRoom(roomSnapshot(initial, { game: { endedSeat: 0, reason: "resign" } }));
		expect(room.activeSeat).toBeNull();
	});

	test("no seat burns clock on a pinned past round", () => {
		const room = createRoom(
			roomSnapshot(initial, { game: { round: 1, latestRound: 2, isLive: false } })
		);
		expect(room.activeSeat).toBeNull();
	});

	test.fails("no seat burns clock while waiting for an opponent", () => {
		// Bug: activeSeat ignores isWaitingForOpponent, contrary to Room's documented activeSeat contract.
		const room = createRoom(roomSnapshot(initial, { players: [ALICE, null] }));
		expect(room.clock.activeSeat).toBeNull();
	});

	test("a checkers room loaded as tic-tac-toe shows no boards and can't be played", () => {
		const room = createRoom(roomSnapshot(checkersEngine.createInitialState()));
		expect(room.wrongGameType).toBe(true);
		expect(room.boards).toEqual([]);
		expect(room.canPlay(0)).toBe(false);
	});

	test("reviewing history shows that move's boards and whose turn it was", () => {
		const first = played([0, 0]);
		const second = played([0, 0], [1, 0]);
		const room = createRoom(roomSnapshot(second));
		setQueryResult(api.models.games.index.history, historyOf([first, second]));

		room.stepBack();

		expect(room.boards).toEqual(first.boards);
		expect(room.turn).toBe("O");
	});
});
