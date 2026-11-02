import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import type { TictactoeState } from "../games/tictactoe/index.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getCurrentGame, getGame } from "../games/index.js";
import { getRoomByCode } from "./auth.js";

const { abandon, create, rematch } = api.models.rooms.index;
const { resign, timeout } = api.models.games.index;

type Board = TictactoeState["boards"][number];
const EMPTY: Board = Array(9).fill(null);
const X_WON: Board = ["X", "X", "X", null, null, null, null, null, null];

const START = 1_000_000;
const TEN_SECONDS = 10_000;

/** Each seat's player row plus its clock and result for the given round (latest when omitted). */
async function seats(t: TestConvex, code: string, round?: number) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getGame(ctx, room._id, round);
		if (!game) throw new Error(`No game in room ${code}`);
		return await Promise.all(
			room.players.map(async (id) => ({
				player: await ctx.db.get(id),
				clock: await ctx.db
					.query("clocks")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", game._id).eq("playerId", id))
					.unique(),
				result: await ctx.db
					.query("results")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", game._id).eq("playerId", id))
					.unique()
			}))
		);
	});
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(START);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("timeout", () => {
	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		vi.setSystemTime(START + TEN_SECONDS);
		await expect(t.mutation(timeout, { code })).rejects.toThrow("Sign in to play");
	});

	test("rejects an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await expect(ada.mutation(timeout, { code: "ZZZZZZ" })).rejects.toThrow("Room not found");
	});

	test("ends the running seat's round once its clock hits zero", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		vi.setSystemTime(START + TEN_SECONDS);
		await b.mutation(timeout, { code });
		const [ada, bea] = await seats(t, code);
		expect(ada?.result?.state).toBe("timeout");
		expect(bea?.result).toBeNull();
	});

	test("zeroes and stops the expired clock", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		vi.setSystemTime(START + TEN_SECONDS);
		await b.mutation(timeout, { code });
		const [ada] = await seats(t, code);
		expect(ada?.clock?.remaining).toBe(0);
		expect(ada?.clock?.turnedAt).toBeUndefined();
	});

	test("accepts a call from a spectator", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		const cy = await signIn(t, "user_c", "Cy");
		vi.setSystemTime(START + TEN_SECONDS);
		await cy.mutation(timeout, { code });
		const [ada] = await seats(t, code);
		expect(ada?.result?.state).toBe("timeout");
	});

	test("is a no-op while the clock still has time left", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		vi.setSystemTime(START + TEN_SECONDS - 1);
		await b.mutation(timeout, { code });
		const [ada] = await seats(t, code);
		expect(ada?.result).toBeNull();
		expect(ada?.clock?.turnedAt).toBe(START);
	});

	test("is a no-op in a closed room", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		await b.mutation(abandon, { code });
		vi.setSystemTime(START + TEN_SECONDS);
		await a.mutation(timeout, { code });
		const [ada] = await seats(t, code);
		expect(ada?.result?.state).toBeUndefined();
		expect(ada?.clock?.remaining).toBe(TEN_SECONDS);
	});

	test("is a no-op while waiting for an opponent", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: TEN_SECONDS });
		vi.setSystemTime(START + 60 * TEN_SECONDS);
		await ada.mutation(timeout, { code });
		const [host] = await seats(t, code);
		expect(host?.result).toBeNull();
	});

	test("is a no-op once the round was resigned", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		await b.mutation(resign, { code });
		vi.setSystemTime(START + TEN_SECONDS);
		await a.mutation(timeout, { code });
		const [ada] = await seats(t, code);
		expect(ada?.result).toBeNull();
	});

	test("is a no-op for a round already won on the board", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			const game = await getCurrentGame(ctx, room._id);
			if (!game) throw new Error(`No game in room ${code}`);
			const boards = [X_WON, X_WON, X_WON, ...Array<Board>(6).fill(EMPTY)];
			await ctx.db.patch(game._id, { state: { kind: "tictactoe", boards } });
		});
		vi.setSystemTime(START + TEN_SECONDS);
		await b.mutation(timeout, { code });
		const [ada] = await seats(t, code);
		expect(ada?.result).toBeNull();
	});

	test("gives the round to the timed-out seat's opponent on rematch", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe", TEN_SECONDS);
		vi.setSystemTime(START + TEN_SECONDS);
		await b.mutation(timeout, { code });
		await b.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code, 1);
		expect([ada?.player?.score, bea?.player?.score]).toEqual([0, 1]);
		expect([ada?.result?.mmr, bea?.result?.mmr]).toEqual([-8, 8]);
	});
});
