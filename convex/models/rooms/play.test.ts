import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import type { TictactoeState } from "../games/tictactoe/index.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { clockByGameAndPlayer } from "../clocks/index.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode } from "./auth.js";

const { create, play, abandon } = api.models.rooms.index;
const { resign } = api.models.games.index;

type Board = TictactoeState["boards"][number];
const EMPTY: Board = Array(9).fill(null);
const X_WON: Board = ["X", "X", "X", null, null, null, null, null, null];
const X_TWO: Board = ["X", "X", null, null, null, null, null, null, null];

const START = 1_000_000;

async function snapshot(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		const clocks = await Promise.all(
			room.players.map((id) => clockByGameAndPlayer(ctx, game._id, id))
		);
		const moves = await ctx.db
			.query("moves")
			.withIndex("byGame", (q) => q.eq("gameId", game._id))
			.collect();
		return { room, game, moves, clocks };
	});
}

async function setBoards(t: TestConvex, code: string, boards: Board[]) {
	await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		await ctx.db.patch(game._id, { state: { kind: "tictactoe", boards } });
	});
}

const corner = { kind: "tictactoe", boardIndex: 0, cellIndex: 0 } as const;

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(START);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("play", () => {
	test("rejects an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await expect(ada.mutation(play, { code: "ZZZZZZ", move: corner })).rejects.toThrow(
			"Room not found"
		);
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await expect(t.mutation(play, { code, move: corner })).rejects.toThrow("Sign in to play");
	});

	test("rejects a spectator", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(play, { code, move: corner })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("rejects a move in a closed room", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(abandon, { code });
		await expect(a.mutation(play, { code, move: corner })).rejects.toThrow(
			"This room is no longer active"
		);
	});

	test("rejects a move for a different game", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await expect(
			a.mutation(play, { code, move: { kind: "checkers", from: 40, to: 33 } })
		).rejects.toThrow("Move does not match this room's game");
	});

	test("rejects a move out of turn", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		await expect(b.mutation(play, { code, move: corner })).rejects.toThrow("Not your turn");
	});

	test("rejects a move once the round has been resigned", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await expect(a.mutation(play, { code, move: corner })).rejects.toThrow(
			"This round is already over"
		);
	});

	// Bug: play never checks that every seat is filled, so the host can move before anyone joins.
	test.fails("rejects a move while the second seat is still empty", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await expect(ada.mutation(play, { code, move: corner })).rejects.toThrow();
	});

	test("applies an accepted move to the game state", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(play, { code, move: corner });
		const { game } = await snapshot(t, code);
		expect(game.state.kind === "tictactoe" && game.state.boards[0]![0]).toBe("X");
	});

	test("records an accepted move as turn 0 by the mover", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(play, { code, move: corner });
		const { room, moves } = await snapshot(t, code);
		expect(moves).toHaveLength(1);
		expect(moves[0]).toMatchObject({ turn: 0, playerId: room.players[0] });
	});

	test("numbers later moves sequentially", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(play, { code, move: corner });
		await b.mutation(play, { code, move: { kind: "tictactoe", boardIndex: 1, cellIndex: 4 } });
		const { moves } = await snapshot(t, code);
		expect(moves.map((move) => move.turn)).toEqual([0, 1]);
	});

	test("ignores a move onto an occupied cell", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(play, { code, move: corner });
		await b.mutation(play, { code, move: corner });
		const { moves, clocks } = await snapshot(t, code);
		expect(moves).toHaveLength(1);
		expect(clocks[1]?.turnedAt).toBe(START);
	});

	test("banks the mover's elapsed time and stops their clock", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 3_000);
		await a.mutation(play, { code, move: corner });
		const { clocks } = await snapshot(t, code);
		expect(clocks[0]?.remaining).toBe(5 * 60_000 - 3_000);
		expect(clocks[0]?.turnedAt).toBeUndefined();
	});

	test("starts the opponent's clock after a move", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 3_000);
		await a.mutation(play, { code, move: corner });
		const { clocks } = await snapshot(t, code);
		expect(clocks[1]).toMatchObject({ remaining: 5 * 60_000, turnedAt: START + 3_000 });
	});

	test("rejects a move after the mover's clock ran out", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe", 10_000);
		vi.setSystemTime(START + 10_000);
		await expect(a.mutation(play, { code, move: corner })).rejects.toThrow("Time's up");
	});

	test("leaves the game untouched when a move is rejected for time", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe", 10_000);
		vi.setSystemTime(START + 10_000);
		await a.mutation(play, { code, move: corner }).catch(() => undefined);
		const { moves, clocks } = await snapshot(t, code);
		expect(moves).toHaveLength(0);
		expect(clocks[0]).toMatchObject({ remaining: 10_000, turnedAt: START });
	});

	test("starts no clock after the winning move", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, [X_WON, X_WON, X_TWO, ...Array(6).fill(EMPTY)]);
		await a.mutation(play, { code, move: { kind: "tictactoe", boardIndex: 2, cellIndex: 2 } });
		const { clocks } = await snapshot(t, code);
		expect(clocks.map((clock) => clock?.turnedAt)).toEqual([undefined, undefined]);
	});
});
