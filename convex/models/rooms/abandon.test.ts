import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import type { TictactoeState } from "../games/tictactoe/index.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode } from "./auth.js";

const { abandon, create } = api.models.rooms.index;
const { resign } = api.models.games.index;

type Board = TictactoeState["boards"][number];
const EMPTY: Board = Array(9).fill(null);
const X_WON: Board = ["X", "X", "X", null, null, null, null, null, null];
const O_WON: Board = ["O", "O", "O", null, null, null, null, null, null];

const START = 1_000_000;

async function setBoards(t: TestConvex, code: string, boards: Board[]) {
	await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		await ctx.db.patch(game._id, { state: { kind: "tictactoe", boards } });
	});
}

/** The room plus each seat's player row, rating, clock, and current-round result, in seat order. */
async function snapshot(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		const seats = await Promise.all(
			room.players.map(async (id) => {
				const player = await ctx.db.get(id);
				if (!player) throw new Error(`No player ${id}`);
				const rating = await ctx.db
					.query("ratings")
					.withIndex("byUser", (q) => q.eq("userId", player.userId))
					.unique();
				const clock = await ctx.db
					.query("clocks")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", game._id).eq("playerId", id))
					.unique();
				const result = await ctx.db
					.query("results")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", game._id).eq("playerId", id))
					.unique();
				return { player, rating: rating?.rating ?? null, clock, result };
			})
		);
		return { room, seats };
	});
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(START);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("abandon", () => {
	test("rejects an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await expect(ada.mutation(abandon, { code: "ZZZZZZ" })).rejects.toThrow("Room not found");
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await expect(t.mutation(abandon, { code })).rejects.toThrow("Sign in to play");
	});

	test("rejects a spectator", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(abandon, { code })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("closes the room as abandoned", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 5_000);
		await a.mutation(abandon, { code });
		const { room } = await snapshot(t, code);
		expect(room).toMatchObject({ status: "closed", closedAt: START + 5_000, reason: "abandoned" });
	});

	test("marks the abandoner's membership over", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 5_000);
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats[0]?.player.leftAt).toBe(START + 5_000);
		expect(seats[1]?.player.leftAt).toBeUndefined();
	});

	test("ends the abandoner's round in progress as abandoned", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats[0]?.result?.state).toBe("abandon");
		expect(seats[0]?.clock?.turnedAt).toBeUndefined();
	});

	test("awards the opponent a point for a round in progress", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 1]);
	});

	test("settles ratings in the opponent's favor for a round in progress", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.rating)).toEqual([392, 408]);
		expect(seats.map((seat) => seat.result?.mmr)).toEqual([-8, 8]);
	});

	test("ends a lone host's round without rating anyone", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await ada.mutation(abandon, { code });
		const { room, seats } = await snapshot(t, code);
		expect(room.status).toBe("closed");
		expect(seats[0]?.result).toMatchObject({ state: "abandon" });
		expect(seats[0]?.result?.mmr).toBeUndefined();
		expect(seats[0]?.rating).toBeNull();
	});

	test("is a no-op when called again by the same player", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		vi.setSystemTime(START + 60_000);
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats[0]?.player.leftAt).toBe(START);
		expect(seats[1]?.player.score).toBe(1);
	});

	test("is a no-op for the remaining player once the room has closed", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		await b.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats[1]?.player.leftAt).toBeUndefined();
		expect(seats.map((seat) => seat.rating)).toEqual([392, 408]);
	});

	test("cashes in a finished round the opponent won", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, [O_WON, O_WON, O_WON, ...Array<Board>(6).fill(EMPTY)]);
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 1]);
		expect(seats[0]?.result?.state).toBeUndefined();
	});

	test("credits nobody for a finished round the abandoner won", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, [X_WON, X_WON, X_WON, ...Array<Board>(6).fill(EMPTY)]);
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 0]);
		expect(seats.map((seat) => seat.rating)).toEqual([null, null]);
	});

	test("credits the opponent once for a round the abandoner had already resigned", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(resign, { code });
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 1]);
		expect(seats[0]?.result).toMatchObject({ state: "resign", mmr: -8 });
	});

	test("credits nobody when the opponent had already resigned the round", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 0]);
		expect(seats.map((seat) => seat.result?.state)).toEqual([undefined, "resign"]);
	});
});
