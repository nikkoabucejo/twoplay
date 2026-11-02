import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api.js";
import { seatedRoom, setup, type TestConvex } from "../../test.setup.js";
import { getRoomByCode } from "../rooms/auth.js";
import { clockByGameAndPlayer, clocksByGame } from "./index.js";

/** The room's seats and its games, oldest round first. */
async function roomAndGames(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const games = await ctx.db
			.query("games")
			.withIndex("byRoom", (q) => q.eq("roomId", room._id))
			.collect();
		return { players: room.players, games };
	});
}

describe("clocksByGame", () => {
	test("returns one clock per seat", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { players, games } = await roomAndGames(t, code);
		const clocks = await t.run((ctx) => clocksByGame(ctx, games[0]._id));
		expect(clocks.map((clock) => clock.playerId).sort()).toEqual([...players].sort());
	});

	test("returns only the given round's clocks", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(api.models.games.index.resign, { code });
		await a.mutation(api.models.rooms.index.rematch, { code });
		const { games } = await roomAndGames(t, code);
		const clocks = await t.run((ctx) => clocksByGame(ctx, games[1]._id));
		expect(clocks).toHaveLength(2);
		expect(clocks.every((clock) => clock.gameId === games[1]._id)).toBe(true);
	});
});

describe("clockByGameAndPlayer", () => {
	test("returns the seat's own clock", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { players, games } = await roomAndGames(t, code);
		const clock = await t.run((ctx) => clockByGameAndPlayer(ctx, games[0]._id, players[1]));
		expect(clock?.playerId).toBe(players[1]);
	});

	test("returns null for a player with no clock in that game", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { players, games } = await roomAndGames(t, code);
		const clock = await t.run(async (ctx) => {
			const own = await clockByGameAndPlayer(ctx, games[0]._id, players[1]);
			if (!own) throw new Error("Guest has no clock");
			await ctx.db.delete(own._id);
			return await clockByGameAndPlayer(ctx, games[0]._id, players[1]);
		});
		expect(clock).toBeNull();
	});
});
