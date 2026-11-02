import { describe, expect, test } from "vitest";
import { seatedRoom, setup, type TestConvex } from "../../test.setup.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode } from "../rooms/auth.js";
import { creditMmr, markEnded, resultByGameAndPlayer, resultsByGame } from "./index.js";

/** A fresh seated room's round-1 game id and both seats' player ids. */
async function roundOne(t: TestConvex) {
	const { code } = await seatedRoom(t, "tictactoe");
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		return { gameId: game._id, host: room.players[0], guest: room.players[1] };
	});
}

describe("resultsByGame", () => {
	test("is empty for a round nobody has finished", async () => {
		const t = setup();
		const { gameId } = await roundOne(t);
		expect(await t.run((ctx) => resultsByGame(ctx, gameId))).toEqual([]);
	});

	test("returns every seat's result for the round", async () => {
		const t = setup();
		const { gameId, host, guest } = await roundOne(t);
		const results = await t.run(async (ctx) => {
			await creditMmr(ctx, gameId, host, 8);
			await creditMmr(ctx, gameId, guest, -8);
			return await resultsByGame(ctx, gameId);
		});
		expect(results.map((result) => result.mmr).sort()).toEqual([-8, 8]);
	});
});

describe("resultByGameAndPlayer", () => {
	test("returns null for a seat with no result", async () => {
		const t = setup();
		const { gameId, host } = await roundOne(t);
		expect(await t.run((ctx) => resultByGameAndPlayer(ctx, gameId, host))).toBeNull();
	});

	test("returns only the given seat's result", async () => {
		const t = setup();
		const { gameId, host, guest } = await roundOne(t);
		const result = await t.run(async (ctx) => {
			await markEnded(ctx, gameId, guest, "resign");
			return await resultByGameAndPlayer(ctx, gameId, host);
		});
		expect(result).toBeNull();
	});
});

describe("markEnded", () => {
	test("records why the seat's round ended", async () => {
		const t = setup();
		const { gameId, host } = await roundOne(t);
		const result = await t.run(async (ctx) => {
			await markEnded(ctx, gameId, host, "timeout");
			return await resultByGameAndPlayer(ctx, gameId, host);
		});
		expect(result?.state).toBe("timeout");
		expect(result?.mmr).toBeUndefined();
	});

	test("keeps a single row when the seat already has one", async () => {
		const t = setup();
		const { gameId, host } = await roundOne(t);
		const results = await t.run(async (ctx) => {
			await markEnded(ctx, gameId, host, "resign");
			await markEnded(ctx, gameId, host, "abandon");
			return await resultsByGame(ctx, gameId);
		});
		expect(results).toHaveLength(1);
		expect(results[0]?.state).toBe("abandon");
	});

	test("keeps an MMR change already credited to the seat", async () => {
		const t = setup();
		const { gameId, host } = await roundOne(t);
		const result = await t.run(async (ctx) => {
			await creditMmr(ctx, gameId, host, -8);
			await markEnded(ctx, gameId, host, "abandon");
			return await resultByGameAndPlayer(ctx, gameId, host);
		});
		expect(result).toMatchObject({ state: "abandon", mmr: -8 });
	});
});

describe("creditMmr", () => {
	test("records the seat's MMR change with no end cause", async () => {
		const t = setup();
		const { gameId, guest } = await roundOne(t);
		const result = await t.run(async (ctx) => {
			await creditMmr(ctx, gameId, guest, 8);
			return await resultByGameAndPlayer(ctx, gameId, guest);
		});
		expect(result?.mmr).toBe(8);
		expect(result?.state).toBeUndefined();
	});

	test("adds to the row an earlier end cause created", async () => {
		const t = setup();
		const { gameId, host } = await roundOne(t);
		const results = await t.run(async (ctx) => {
			await markEnded(ctx, gameId, host, "resign");
			await creditMmr(ctx, gameId, host, -8);
			return await resultsByGame(ctx, gameId);
		});
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ state: "resign", mmr: -8 });
	});
});
