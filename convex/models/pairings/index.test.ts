import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api.js";
import { setup, signIn, type TestConvex } from "../../test.setup.js";
import type { Id } from "../../_generated/dataModel.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode } from "../rooms/auth.js";
import { userByClerkUserId } from "../users/index.js";

const { enqueue, cancel, status, expired } = api.models.pairings.index;
const sweep = internal.models.pairings.index.sweep;

afterEach(() => {
	vi.useRealTimers();
});

async function userIdOf(t: TestConvex, subject: string): Promise<Id<"users">> {
	const user = await t.run((ctx) => userByClerkUserId(ctx, subject));
	if (!user) throw new Error(`No user for ${subject}`);
	return user._id;
}

function queue(t: TestConvex) {
	return t.run((ctx) => ctx.db.query("pairings").collect());
}

async function queuedSubjects(t: TestConvex) {
	return await t.run(async (ctx) => {
		const entries = await ctx.db.query("pairings").collect();
		const users = await Promise.all(entries.map((entry) => ctx.db.get(entry.userId)));
		return users.map((user) => user?.clerk__userId);
	});
}

/** The room behind a match result, with its seats resolved to user subjects. */
async function matchedRoom(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const seats = await Promise.all(room.players.map((id) => ctx.db.get(id)));
		const subjects = await Promise.all(
			seats.map(async (seat) => seat && (await ctx.db.get(seat.userId))?.clerk__userId)
		);
		return { room, seats, subjects };
	});
}

test("enqueue waits when nobody else is queued for that game", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");

	expect(await a.mutation(enqueue, { type: "tictactoe" })).toEqual({ status: "waiting" });
	expect(await a.query(status, {})).toBe(true);
});

test("enqueue stores the default 5-minute time control when none is given", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	await a.mutation(enqueue, { type: "tictactoe" });

	expect((await queue(t))[0]).toMatchObject({ type: "tictactoe", time: 300_000 });
});

test("enqueue clamps an out-of-range time control", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe", timeControlMs: 1 });
	await b.mutation(enqueue, { type: "checkers", timeControlMs: 24 * 60 * 60_000 });

	expect((await queue(t)).map((entry) => entry.time)).toEqual([10_000, 60 * 60_000]);
});

test("enqueue pairs with an opponent waiting for the same game", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "checkers" });

	const result = await b.mutation(enqueue, { type: "checkers" });
	expect(result).toMatchObject({ status: "matched", type: "checkers" });
});

test("enqueue pairs two players waiting for chess", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "chess" });

	const result = await b.mutation(enqueue, { type: "chess" });
	expect(result).toMatchObject({ status: "matched", type: "chess" });
});

test("a match seats the waiting opponent first and the newcomer second", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	const result = await b.mutation(enqueue, { type: "tictactoe" });
	if (result.status !== "matched") throw new Error("Expected a match");

	const { subjects, seats } = await matchedRoom(t, result.code);
	expect(subjects).toEqual(["user_a", "user_b"]);
	expect(seats.map((seat) => seat?.name)).toEqual(["Ada", "Bea"]);
});

test("a match creates an active private room of the queued game type", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "checkers" });
	const result = await b.mutation(enqueue, { type: "checkers" });
	if (result.status !== "matched") throw new Error("Expected a match");

	const { room } = await matchedRoom(t, result.code);
	expect(room).toMatchObject({ type: "checkers", visibility: "private", status: "active" });
});

test("a match adopts the waiting opponent's time control over the newcomer's", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe", timeControlMs: 60_000 });
	const result = await b.mutation(enqueue, { type: "tictactoe", timeControlMs: 600_000 });
	if (result.status !== "matched") throw new Error("Expected a match");

	expect((await matchedRoom(t, result.code)).room.time).toBe(60_000);
});

test("a match starts round one with only the first seat's clock running", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe", timeControlMs: 60_000 });
	const result = await b.mutation(enqueue, { type: "tictactoe" });
	if (result.status !== "matched") throw new Error("Expected a match");

	const { round, clocks } = await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, result.code);
		const game = room && (await getCurrentGame(ctx, room._id));
		if (!room || !game) throw new Error(`No live game in room ${result.code}`);
		const clockRows = await ctx.db.query("clocks").collect();
		return {
			round: game.round,
			clocks: room.players.map((id) => clockRows.find((clock) => clock.playerId === id))
		};
	});
	expect(round).toBe(1);
	expect(clocks.map((clock) => clock?.remaining)).toEqual([60_000, 60_000]);
	expect(clocks.map((clock) => clock?.turnedAt)).toEqual([
		Date.parse("2026-01-01T12:00:00Z"),
		undefined
	]);
});

test("a match takes both users out of the queue", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	await b.mutation(enqueue, { type: "tictactoe" });

	expect(await queue(t)).toHaveLength(0);
	expect(await a.query(status, {})).toBe(false);
	expect(await b.query(status, {})).toBe(false);
});

test("a match makes the room each user's active room", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	const result = await b.mutation(enqueue, { type: "tictactoe" });
	if (result.status !== "matched") throw new Error("Expected a match");

	expect(await a.query(api.models.rooms.index.active, {})).toEqual({
		code: result.code,
		type: "tictactoe"
	});
	expect(await b.query(api.models.rooms.index.active, {})).toEqual({
		code: result.code,
		type: "tictactoe"
	});
});

test("enqueue pairs with the longest-waiting opponent", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	await signIn(t, "user_c", "Cy");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	// A second same-type entry can't come from `enqueue` itself (it would match), so seed it.
	const cId = await userIdOf(t, "user_c");
	await t.run((ctx) =>
		ctx.db.insert("pairings", { userId: cId, type: "tictactoe", time: 300_000 })
	);
	const result = await b.mutation(enqueue, { type: "tictactoe" });
	if (result.status !== "matched") throw new Error("Expected a match");

	expect((await matchedRoom(t, result.code)).subjects).toEqual(["user_a", "user_b"]);
	expect(await queuedSubjects(t)).toEqual(["user_c"]);
});

test("enqueue does not pair across game types", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });

	expect(await b.mutation(enqueue, { type: "checkers" })).toEqual({ status: "waiting" });
	expect(await queue(t)).toHaveLength(2);
});

test("enqueue returns the caller's active room instead of queueing", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const { code } = await a.mutation(api.models.rooms.index.create, { type: "checkers" });

	expect(await a.mutation(enqueue, { type: "tictactoe" })).toEqual({
		status: "matched",
		code,
		type: "checkers"
	});
	expect(await queue(t)).toHaveLength(0);
});

test("enqueue queues a user whose previous room has closed", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const { code } = await a.mutation(api.models.rooms.index.create, { type: "checkers" });
	await a.mutation(api.models.rooms.index.abandon, { code });

	expect(await a.mutation(enqueue, { type: "tictactoe" })).toEqual({ status: "waiting" });
});

test("re-enqueueing while already waiting keeps a single entry", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	await a.mutation(enqueue, { type: "tictactoe" });

	expect(await a.mutation(enqueue, { type: "tictactoe" })).toEqual({ status: "waiting" });
	expect(await queue(t)).toHaveLength(1);
});

test("re-enqueueing for another game keeps the original entry", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	await a.mutation(enqueue, { type: "tictactoe", timeControlMs: 60_000 });
	await a.mutation(enqueue, { type: "checkers", timeControlMs: 600_000 });

	const entries = await queue(t);
	expect(entries).toHaveLength(1);
	expect(entries[0]).toMatchObject({ type: "tictactoe", time: 60_000 });
});

test("enqueue queues the caller when the waiting opponent's account is gone", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	const aId = await userIdOf(t, "user_a");
	await t.run((ctx) => ctx.db.delete(aId));

	expect(await b.mutation(enqueue, { type: "tictactoe" })).toEqual({ status: "waiting" });
	expect(await queuedSubjects(t)).toEqual(["user_b"]);
	expect(await t.run((ctx) => ctx.db.query("rooms").collect())).toHaveLength(0);
});

test("enqueue does not pair with an opponent who has since entered a room", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	await a.mutation(api.models.rooms.index.create, { type: "checkers" });
	await b.mutation(enqueue, { type: "tictactoe" });

	const aId = await userIdOf(t, "user_a");
	const activeRoomsOfA = await t.run(async (ctx) => {
		const seats = await ctx.db
			.query("players")
			.withIndex("byUser", (q) => q.eq("userId", aId))
			.collect();
		const rooms = await Promise.all(seats.map((seat) => ctx.db.get(seat.roomId)));
		return rooms.filter((room) => room?.status === "active").length;
	});
	expect(activeRoomsOfA).toBe(1);
	expect(await queuedSubjects(t)).toEqual(["user_b"]);
	expect(await b.query(status, {})).toBe(true);
});

test("enqueue skips and deletes a waiting entry whose user has an active room", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await signIn(t, "user_c", "Cy");
	await a.mutation(api.models.rooms.index.create, { type: "checkers" });
	const [aId, cId] = [await userIdOf(t, "user_a"), await userIdOf(t, "user_c")];
	await t.run(async (ctx) => {
		await ctx.db.insert("pairings", { userId: aId, type: "tictactoe", time: 300_000 });
		await ctx.db.insert("pairings", { userId: cId, type: "tictactoe", time: 300_000 });
	});
	const result = await b.mutation(enqueue, { type: "tictactoe" });
	if (result.status !== "matched") throw new Error("Expected a match");

	expect((await matchedRoom(t, result.code)).subjects).toEqual(["user_c", "user_b"]);
	expect(await queue(t)).toHaveLength(0);
});

test("enqueue rejects a signed-out caller", async () => {
	const t = setup();

	await expect(t.mutation(enqueue, { type: "tictactoe" })).rejects.toThrow("Sign in to play");
});

test("enqueue rejects an identity with no stored user", async () => {
	const t = setup();

	await expect(
		t.withIdentity({ subject: "user_unstored" }).mutation(enqueue, { type: "tictactoe" })
	).rejects.toThrow("Sign in to play");
});

test("cancel removes the caller's queue entry", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	await a.mutation(enqueue, { type: "tictactoe" });
	await a.mutation(cancel, {});

	expect(await a.query(status, {})).toBe(false);
	expect(await queue(t)).toHaveLength(0);
});

test("cancel leaves other users' entries in the queue", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	await b.mutation(enqueue, { type: "checkers" });
	await a.mutation(cancel, {});

	expect(await queuedSubjects(t)).toEqual(["user_b"]);
});

test("cancel does nothing for a caller who isn't queued", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");

	await expect(a.mutation(cancel, {})).resolves.toBeNull();
	expect(await a.query(status, {})).toBe(false);
});

test("cancel rejects a signed-out caller", async () => {
	const t = setup();

	await expect(t.mutation(cancel, {})).rejects.toThrow("Sign in to play");
});

test("status is false for a caller who never queued", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");

	expect(await a.query(status, {})).toBe(false);
});

test("status reflects only the caller's own entry", async () => {
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });

	expect(await b.query(status, {})).toBe(false);
});

test("status rejects a signed-out caller", async () => {
	const t = setup();

	await expect(t.query(status, {})).rejects.toThrow("Sign in to play");
});

test("sweep expires an entry waiting longer than 5 minutes", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	await a.mutation(enqueue, { type: "tictactoe" });
	vi.setSystemTime(new Date("2026-01-01T12:05:00.001Z"));
	await t.mutation(sweep, {});

	expect((await queue(t))[0]?.expiredAt).toBe(Date.parse("2026-01-01T12:05:00.001Z"));
	expect(await a.query(status, {})).toBe(false);
	expect(await a.query(expired, {})).toBe(true);
});

test("sweep deletes an entry expired for over 60 minutes", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	await a.mutation(enqueue, { type: "tictactoe" });
	vi.setSystemTime(new Date("2026-01-01T12:05:00.001Z"));
	await t.mutation(sweep, {});
	vi.setSystemTime(new Date("2026-01-01T13:05:00.002Z"));
	await t.mutation(sweep, {});

	expect(await queue(t)).toHaveLength(0);
});

test("enqueueing after expiry leaves one waiting entry", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	await a.mutation(enqueue, { type: "tictactoe" });
	vi.setSystemTime(new Date("2026-01-01T12:06:00Z"));
	await t.mutation(sweep, {});
	await a.mutation(enqueue, { type: "tictactoe" });

	const entries = await queue(t);
	expect(entries).toHaveLength(1);
	expect(entries[0]?.expiredAt).toBeUndefined();
	expect(await a.query(expired, {})).toBe(false);
});

test("sweep keeps an entry exactly 5 minutes old", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T11:59:59Z"));
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	await a.mutation(enqueue, { type: "tictactoe" });
	vi.setSystemTime(new Date("2026-01-01T12:05:00Z"));
	await t.mutation(sweep, {});

	expect(await queue(t)).toHaveLength(1);
	expect((await queue(t))[0]?.expiredAt).toBeUndefined();
});

test("sweep expires only the entries past 5 minutes", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	vi.setSystemTime(new Date("2026-01-01T12:04:00Z"));
	await b.mutation(enqueue, { type: "checkers" });
	vi.setSystemTime(new Date("2026-01-01T12:06:00Z"));
	await t.mutation(sweep, {});

	expect(await a.query(expired, {})).toBe(true);
	expect(await b.query(expired, {})).toBe(false);
});

test("an expired entry no longer pairs with a newcomer", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	vi.setSystemTime(new Date("2026-01-01T12:10:00Z"));
	await t.mutation(sweep, {});

	expect(await b.mutation(enqueue, { type: "tictactoe" })).toEqual({ status: "waiting" });
	expect(await a.query(api.models.rooms.index.active, {})).toBeNull();
});

test("enqueue pairs with a waiting entry behind an expired one", async () => {
	const t = setup();
	const b = await signIn(t, "user_b", "Bea");
	await signIn(t, "user_a", "Ada");
	await signIn(t, "user_c", "Cy");
	const [aId, cId] = [await userIdOf(t, "user_a"), await userIdOf(t, "user_c")];
	await t.run(async (ctx) => {
		await ctx.db.insert("pairings", {
			userId: aId,
			type: "tictactoe",
			time: 300_000,
			expiredAt: 1
		});
		await ctx.db.insert("pairings", { userId: cId, type: "tictactoe", time: 300_000 });
	});
	const result = await b.mutation(enqueue, { type: "tictactoe" });
	if (result.status !== "matched") throw new Error("Expected a match");

	expect((await matchedRoom(t, result.code)).subjects).toEqual(["user_c", "user_b"]);
	expect(await queuedSubjects(t)).toEqual(["user_a"]);
});

test("expired rejects a signed-out caller", async () => {
	const t = setup();

	await expect(t.query(expired, {})).rejects.toThrow("Sign in to play");
});

test("expired is false for a caller who isn't queued while another user's entry expired", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	await a.mutation(enqueue, { type: "tictactoe" });
	vi.setSystemTime(new Date("2026-01-01T12:06:00Z"));
	await t.mutation(sweep, {});

	expect(await b.query(expired, {})).toBe(false);
});
