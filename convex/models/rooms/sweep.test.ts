import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode } from "./auth.js";

const { create } = api.models.rooms.index;
const { resign } = api.models.games.index;
const { heartbeat } = api.models.players.index;
const sweep = internal.models.rooms.index.sweep;

const START = 1_000_000;
const MINUTE = 60_000;

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

async function waitingRoom(t: TestConvex) {
	const ada = await signIn(t, "user_a", "Ada");
	const { code } = await ada.mutation(create, { type: "tictactoe" });
	return { ada, code };
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(START);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("sweep of rooms waiting for an opponent", () => {
	test("leaves a room that has waited exactly 45 minutes", async () => {
		const t = setup();
		const { code } = await waitingRoom(t);
		vi.setSystemTime(START + 45 * MINUTE);
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room.status).toBe("active");
	});

	test("closes a room that has waited over 45 minutes as empty", async () => {
		const t = setup();
		const { code } = await waitingRoom(t);
		vi.setSystemTime(START + 45 * MINUTE + 1);
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room).toMatchObject({
			status: "closed",
			closedAt: START + 45 * MINUTE + 1,
			reason: "empty"
		});
	});

	test("ends the lone host's round as abandoned", async () => {
		const t = setup();
		const { code } = await waitingRoom(t);
		vi.setSystemTime(START + 46 * MINUTE);
		await t.mutation(sweep, {});
		const { seats } = await snapshot(t, code);
		expect(seats[0]?.result?.state).toBe("abandon");
		expect(seats[0]?.clock?.turnedAt).toBeUndefined();
	});

	test("keeps a lone host's earlier resignation as the round's cause", async () => {
		const t = setup();
		const { ada, code } = await waitingRoom(t);
		await ada.mutation(resign, { code });
		vi.setSystemTime(START + 46 * MINUTE);
		await t.mutation(sweep, {});
		const { seats } = await snapshot(t, code);
		expect(seats[0]?.result?.state).toBe("resign");
	});

	test("ignores heartbeats when deciding a waiting room is empty", async () => {
		const t = setup();
		const { ada, code } = await waitingRoom(t);
		vi.setSystemTime(START + 46 * MINUTE);
		await ada.mutation(heartbeat, { code });
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room.reason).toBe("empty");
	});

	// Bug: sweep only scans `status: "active"`, but `isRoomActive` also treats a missing status as active.
	test.fails("closes an old waiting room that predates the status field", async () => {
		const t = setup();
		const { code } = await waitingRoom(t);
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			await ctx.db.patch(room._id, { status: undefined });
		});
		vi.setSystemTime(START + 46 * MINUTE);
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room.status).toBe("closed");
	});
});

describe("sweep of full rooms", () => {
	test("leaves a room whose seats were both seen within 4 minutes", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 4 * MINUTE);
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room.status).toBe("active");
	});

	test("keeps a room alive past 4 minutes while both seats heartbeat", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 3 * MINUTE);
		await a.mutation(heartbeat, { code });
		await b.mutation(heartbeat, { code });
		vi.setSystemTime(START + 6 * MINUTE);
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room.status).toBe("active");
	});

	test("closes the room as abandoned when one seat has been silent over 4 minutes", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 3 * MINUTE);
		await a.mutation(heartbeat, { code });
		vi.setSystemTime(START + 4 * MINUTE + 1);
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room).toMatchObject({
			status: "closed",
			reason: "abandoned"
		});
	});

	test("forfeits the silent seat to the present one", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 3 * MINUTE);
		await a.mutation(heartbeat, { code });
		vi.setSystemTime(START + 4 * MINUTE + 1);
		await t.mutation(sweep, {});
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([1, 0]);
		expect(seats.map((seat) => seat.rating)).toEqual([408, 392]);
		expect(seats[1]?.result?.state).toBe("abandon");
	});

	test("marks only the silent seat as having left", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 3 * MINUTE);
		await a.mutation(heartbeat, { code });
		vi.setSystemTime(START + 4 * MINUTE + 1);
		await t.mutation(sweep, {});
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.leftAt)).toEqual([undefined, START + 4 * MINUTE + 1]);
	});

	test("closes the room as inactive when every seat went silent", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 5 * MINUTE);
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room).toMatchObject({
			status: "closed",
			closedAt: START + 5 * MINUTE,
			reason: "inactive"
		});
	});

	test("marks every silent seat as having left", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 5 * MINUTE);
		await t.mutation(sweep, {});
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.leftAt)).toEqual([
			START + 5 * MINUTE,
			START + 5 * MINUTE
		]);
	});

	test("credits nobody when every seat went silent", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 5 * MINUTE);
		await t.mutation(sweep, {});
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 0]);
		expect(seats.map((seat) => seat.rating)).toEqual([null, null]);
	});
});

describe("sweep of closed rooms", () => {
	test("leaves an already closed room untouched", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 5 * MINUTE);
		await t.mutation(sweep, {});
		vi.setSystemTime(START + 60 * MINUTE);
		await t.mutation(sweep, {});
		expect((await snapshot(t, code)).room).toMatchObject({
			closedAt: START + 5 * MINUTE,
			reason: "inactive"
		});
	});
});
