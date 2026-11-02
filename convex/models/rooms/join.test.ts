import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { clockByGameAndPlayer } from "../clocks/index.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode } from "./auth.js";

const { create, join, abandon } = api.models.rooms.index;

async function roomOf(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		return room;
	});
}

/** Each seat's round-1 clock, in seat order. */
async function clocksOf(t: TestConvex, code: string) {
	const room = await roomOf(t, code);
	return await t.run(async (ctx) => {
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		return await Promise.all(room.players.map((id) => clockByGameAndPlayer(ctx, game._id, id)));
	});
}

afterEach(() => {
	vi.useRealTimers();
});

describe("join", () => {
	test("rejects an unknown code", async () => {
		const t = setup();
		const bea = await signIn(t, "user_b", "Bea");
		await expect(bea.mutation(join, { code: "ZZZZZZ" })).rejects.toThrow("Room not found");
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await expect(t.mutation(join, { code })).rejects.toThrow("Sign in to play");
	});

	test("takes the open seat", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const result = await bea.mutation(join, { code });
		expect(result).toEqual({ code, type: "tictactoe", redirected: false });
		const room = await roomOf(t, code);
		const seated = await t.run((ctx) => ctx.db.get(room.players[1]));
		expect(seated?.name).toBe("Bea");
	});

	test("gives the newcomer a clock with the room's time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: 30_000 });
		await bea.mutation(join, { code });
		const [, beaClock] = await clocksOf(t, code);
		expect(beaClock?.remaining).toBe(30_000);
		expect(beaClock?.turnedAt).toBeUndefined();
	});

	test("starts the first mover's clock once the last seat fills", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const [adaClock] = await clocksOf(t, code);
		expect(adaClock?.turnedAt).toBe(1_000_000);
	});

	test("rejects a closed room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await ada.mutation(abandon, { code });
		await expect(bea.mutation(join, { code })).rejects.toThrow("This room is no longer active");
	});

	test("rejects a full room", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(join, { code })).rejects.toThrow("Room is full");
	});

	test("is a no-op for someone already seated", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		const result = await b.mutation(join, { code });
		expect(result).toEqual({ code, type: "tictactoe", redirected: false });
		expect((await roomOf(t, code)).players).toHaveLength(2);
	});

	test("is a no-op for a former seat in a closed room", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		expect(await b.mutation(join, { code })).toEqual({
			code,
			type: "tictactoe",
			redirected: false
		});
	});

	test("redirects to the caller's other active room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code: adaCode } = await ada.mutation(create, { type: "tictactoe" });
		const { code: beaCode } = await bea.mutation(create, { type: "checkers" });
		const result = await bea.mutation(join, { code: adaCode });
		expect(result).toEqual({ code: beaCode, type: "checkers", redirected: true });
		expect((await roomOf(t, adaCode)).players).toHaveLength(1);
	});
});
