import { describe, expect, test } from "vitest";
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

/** Each seat's current-round clock and result, in seat order. */
async function seats(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		return await Promise.all(
			room.players.map(async (id) => ({
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

describe("resign", () => {
	test("rejects an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await expect(ada.mutation(resign, { code: "ZZZZZZ" })).rejects.toThrow("Room not found");
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await expect(t.mutation(resign, { code })).rejects.toThrow("Sign in to play");
	});

	test("rejects a spectator", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(resign, { code })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("rejects a closed room", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		await expect(b.mutation(resign, { code })).rejects.toThrow("This room is no longer active");
	});

	test("ends the caller's round as resigned", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		const [ada, bea] = await seats(t, code);
		expect(bea?.result?.state).toBe("resign");
		expect(ada?.result).toBeNull();
	});

	test("stops the resigning player's running clock", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(resign, { code });
		const [ada] = await seats(t, code);
		expect(ada?.clock?.turnedAt).toBeUndefined();
	});

	test("is a no-op once the opponent has already resigned", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(resign, { code });
		const [ada] = await seats(t, code);
		expect(ada?.result).toBeNull();
	});

	test("is a no-op for a round already won on the board", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			const game = await getCurrentGame(ctx, room._id);
			if (!game) throw new Error(`No game in room ${code}`);
			const boards = [X_WON, X_WON, X_WON, ...Array<Board>(6).fill(EMPTY)];
			await ctx.db.patch(game._id, { state: { kind: "tictactoe", boards } });
		});
		await b.mutation(resign, { code });
		const [, bea] = await seats(t, code);
		expect(bea?.result).toBeNull();
	});

	// Bug: resign ends a round with no opponent seat; rematch then crashes on `db.get(undefined)`.
	test.fails("rejects a resign while the second seat is still empty", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await expect(ada.mutation(resign, { code })).rejects.toThrow();
	});
});
