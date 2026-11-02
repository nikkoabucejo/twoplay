import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import type { Doc } from "../../_generated/dataModel.js";
import type { TictactoeState } from "../games/tictactoe/index.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getCurrentGame, getGame } from "../games/index.js";
import { getRoomByCode, requireUser } from "./auth.js";

const { rematch, abandon } = api.models.rooms.index;
const { resign } = api.models.games.index;

type Board = TictactoeState["boards"][number];
const EMPTY: Board = Array(9).fill(null);
const X_WON: Board = ["X", "X", "X", null, null, null, null, null, null];
const O_WON: Board = ["O", "O", "O", null, null, null, null, null, null];
const DRAWN: Board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];

const SEAT_0_WINS = [X_WON, X_WON, X_WON, ...Array<Board>(6).fill(EMPTY)];
const SEAT_1_WINS = [O_WON, O_WON, O_WON, ...Array<Board>(6).fill(EMPTY)];
const DRAW = Array<Board>(9).fill(DRAWN);

async function setBoards(t: TestConvex, code: string, boards: Board[]) {
	await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		await ctx.db.patch(game._id, { state: { kind: "tictactoe", boards } });
	});
}

/** Each seat's player row, rating, and round-1 result, in seat order. */
async function seats(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const firstGame = await getGame(ctx, room._id, 1);
		if (!firstGame) throw new Error(`No round 1 in room ${code}`);
		return await Promise.all(
			room.players.map(async (id) => {
				const player = await ctx.db.get(id);
				if (!player) throw new Error(`No player ${id}`);
				const rating = await ctx.db
					.query("ratings")
					.withIndex("byUser", (q) => q.eq("userId", player.userId))
					.unique();
				const result = await ctx.db
					.query("results")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", firstGame._id).eq("playerId", id))
					.unique();
				return { player, rating: rating?.rating ?? null, result };
			})
		);
	});
}

async function games(t: TestConvex, code: string): Promise<Doc<"games">[]> {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		return await ctx.db
			.query("games")
			.withIndex("byRoom", (q) => q.eq("roomId", room._id))
			.collect();
	});
}

afterEach(() => {
	vi.useRealTimers();
});

describe("rematch", () => {
	test("rejects an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await expect(ada.mutation(rematch, { code: "ZZZZZZ" })).rejects.toThrow("Room not found");
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await expect(t.mutation(rematch, { code })).rejects.toThrow("Sign in to play");
	});

	test("rejects a spectator", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(rematch, { code })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("rejects a closed room", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		await expect(b.mutation(rematch, { code })).rejects.toThrow("This room is no longer active");
	});

	test("rejects a round still in progress", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await expect(a.mutation(rematch, { code })).rejects.toThrow("This round isn't over yet");
	});

	test("starts the next round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		expect((await games(t, code)).map((game) => game.round)).toEqual([1, 2]);
	});

	test("gives the next round fresh clocks with the first mover's running", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe", 20_000);
		await setBoards(t, code, SEAT_0_WINS);
		vi.setSystemTime(1_050_000);
		await a.mutation(rematch, { code });
		const view = await a.query(api.models.rooms.index.get, { code });
		expect(view?.clock).toEqual({ remaining: [20_000, 20_000], turnedAt: 1_050_000 });
	});

	test("adds a point to the winner of a finished round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_1_WINS);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([0, 1]);
	});

	test("moves both ratings by the flat step for a decisive round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.rating, bea?.rating]).toEqual([408, 392]);
	});

	test("records each side's MMR change on the finished round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.result?.mmr, bea?.result?.mmr]).toEqual([8, -8]);
	});

	test("records a zero MMR loss for a loser already at the rating floor", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.run(async (ctx) => {
			const bea = await requireUser(ctx);
			await ctx.db.insert("ratings", { userId: bea._id, rating: 100 });
		});
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [, bea] = await seats(t, code);
		expect(bea?.result?.mmr).toBe(0);
		expect(bea?.rating).toBe(100);
	});

	test("credits the opponent of a player who resigned", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(resign, { code });
		await b.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([0, 1]);
		expect([ada?.result, bea?.result]).toMatchObject([{ state: "resign", mmr: -8 }, { mmr: 8 }]);
	});

	test("leaves scores untouched after a drawn round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, DRAW);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([0, 0]);
	});

	test("leaves ratings and MMR unset after a drawn round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, DRAW);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.rating, bea?.rating]).toEqual([null, null]);
		expect([ada?.result, bea?.result]).toEqual([null, null]);
	});

	test("accumulates the score across rounds", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [ada] = await seats(t, code);
		expect(ada?.player.score).toBe(2);
		expect(ada?.rating).toBe(416);
	});
});
