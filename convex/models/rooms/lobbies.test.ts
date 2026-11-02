import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import { setup, signIn } from "../../test.setup.js";
import { getRoomByCode } from "./auth.js";

const { abandon, create, join, lobbies } = api.models.rooms.index;

const START = 1_000_000;

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(START);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("lobbies", () => {
	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.query(lobbies, {})).rejects.toThrow("Sign in to play");
	});

	test("lists a public room waiting for an opponent", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, {
			type: "checkers",
			visibility: "public",
			timeControlMs: 120_000
		});
		expect(await bea.query(lobbies, {})).toEqual([
			{
				code,
				type: "checkers",
				hostName: "Ada",
				timeControlMs: 120_000,
				createdAt: expect.closeTo(START, 0),
				isOwn: false
			}
		]);
	});

	test("flags the host's own room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		const [room] = await ada.query(lobbies, {});
		expect(room?.isOwn).toBe(true);
	});

	test("leaves out a private room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		await ada.mutation(create, { type: "tictactoe" });
		expect(await bea.query(lobbies, {})).toEqual([]);
	});

	test("leaves out a room that predates the visibility field", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			await ctx.db.patch(room._id, { visibility: undefined });
		});
		expect(await bea.query(lobbies, {})).toEqual([]);
	});

	test("leaves out a public room once its last seat fills", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const cy = await signIn(t, "user_c", "Cy");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		await bea.mutation(join, { code });
		expect(await cy.query(lobbies, {})).toEqual([]);
	});

	test("leaves out a closed public room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		await ada.mutation(abandon, { code });
		expect(await bea.query(lobbies, {})).toEqual([]);
	});

	test("lists the newest room first", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const cy = await signIn(t, "user_c", "Cy");
		const { code: older } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		vi.setSystemTime(START + 60_000);
		const { code: newer } = await bea.mutation(create, { type: "tictactoe", visibility: "public" });
		expect((await cy.query(lobbies, {})).map((room) => room.code)).toEqual([newer, older]);
	});

	test("reports five minutes for a room without a stored time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			await ctx.db.patch(room._id, { time: undefined });
		});
		const [room] = await ada.query(lobbies, {});
		expect(room?.timeControlMs).toBe(5 * 60_000);
	});
});
