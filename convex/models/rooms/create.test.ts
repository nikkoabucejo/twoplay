import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import { setup, signIn, type TestConvex } from "../../test.setup.js";
import { clocksByGame } from "../clocks/index.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode } from "./auth.js";

const create = api.models.rooms.index.create;

async function roomWithHostClock(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		const [clock] = await clocksByGame(ctx, game._id);
		return { room, game, clock };
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("create", () => {
	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.mutation(create, { type: "tictactoe" })).rejects.toThrow("Sign in to play");
	});

	test("returns a fresh six-character code without redirecting", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const result = await ada.mutation(create, { type: "tictactoe" });
		expect(result.redirected).toBe(false);
		expect(result.type).toBe("tictactoe");
		expect(result.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
	});

	test("seats the creator alone in an active room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "checkers" });
		const { room } = await roomWithHostClock(t, code);
		expect(room.status).toBe("active");
		expect(room.players).toHaveLength(1);
		const host = await t.run((ctx) => ctx.db.get(room.players[0]));
		expect(host).toMatchObject({ name: "Ada", score: 0 });
	});

	test("starts round 1 with the host's clock frozen", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const { game, clock } = await roomWithHostClock(t, code);
		expect(game.round).toBe(1);
		expect(clock.turnedAt).toBeUndefined();
		expect(clock.remaining).toBe(5 * 60_000);
	});

	test("defaults the time control to five minutes", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(5 * 60_000);
	});

	test("keeps an in-range time control as given", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: 90_000 });
		const { room, clock } = await roomWithHostClock(t, code);
		expect(room.time).toBe(90_000);
		expect(clock.remaining).toBe(90_000);
	});

	test("raises a time control below ten seconds to ten seconds", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: 1_000 });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(10_000);
	});

	test("raises a negative time control to ten seconds", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: -5 });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(10_000);
	});

	test("lowers a time control above sixty minutes to sixty minutes", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, {
			type: "tictactoe",
			timeControlMs: 2 * 60 * 60_000
		});
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(60 * 60_000);
	});

	test("falls back to five minutes for a NaN time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: NaN });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(5 * 60_000);
	});

	test("falls back to five minutes for an infinite time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: Infinity });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(5 * 60_000);
	});

	test("makes a room private by default", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const { room } = await roomWithHostClock(t, code);
		expect(room.visibility).toBe("private");
	});

	test("makes a room public when asked", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		const { room } = await roomWithHostClock(t, code);
		expect(room.visibility).toBe("public");
	});

	test("redirects to the caller's existing active room instead of creating another", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const first = await ada.mutation(create, { type: "tictactoe" });
		const second = await ada.mutation(create, { type: "checkers" });
		expect(second).toEqual({ code: first.code, type: "tictactoe", redirected: true });
		const roomCount = await t.run(async (ctx) => (await ctx.db.query("rooms").collect()).length);
		expect(roomCount).toBe(1);
	});

	test("creates a new room once the previous one was abandoned", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const first = await ada.mutation(create, { type: "tictactoe" });
		await ada.mutation(api.models.rooms.index.abandon, { code: first.code });
		const second = await ada.mutation(create, { type: "checkers" });
		expect(second.redirected).toBe(false);
		expect(second.code).not.toBe(first.code);
	});

	test("gives up after ten code collisions", async () => {
		const t = setup();
		vi.spyOn(Math, "random").mockReturnValue(0);
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		await ada.mutation(create, { type: "tictactoe" });
		await expect(bea.mutation(create, { type: "tictactoe" })).rejects.toThrow(
			"Could not generate a unique room code"
		);
	});
});
