import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import { seatedRoom, setup, signIn } from "../../test.setup.js";
import { getRoomByCode } from "./auth.js";

const { active, create, get, abandon, rematch } = api.models.rooms.index;
const { resign } = api.models.games.index;

afterEach(() => {
	vi.useRealTimers();
});

describe("active", () => {
	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.query(active, {})).rejects.toThrow("Sign in to play");
	});

	test("returns null for a caller with no room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		expect(await ada.query(active, {})).toBeNull();
	});

	test("returns the caller's active room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "checkers" });
		expect(await ada.query(active, {})).toEqual({ code, type: "checkers" });
	});

	test("returns null once the caller abandoned their room", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		expect(await a.query(active, {})).toBeNull();
	});
});

describe("get", () => {
	test("returns null for an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		expect(await ada.query(get, { code: "ZZZZZZ" })).toBeNull();
	});

	test("returns null for a round that doesn't exist", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		expect(await a.query(get, { code, round: 7 })).toBeNull();
	});

	test("reports the host's seat index", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		expect((await a.query(get, { code }))?.myIndex).toBe(0);
	});

	test("reports the joiner's seat index", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		expect((await b.query(get, { code }))?.myIndex).toBe(1);
	});

	test("shows a spectator both seats with no seat index of their own", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		const view = await cy.query(get, { code });
		expect(view?.myIndex).toBeNull();
		expect(view?.players.map((player) => player?.name)).toEqual(["Ada", "Bea"]);
	});

	test("shows an empty seat as null while waiting for an opponent", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const view = await ada.query(get, { code });
		expect(view?.players[0]).toMatchObject({ name: "Ada", score: 0, seenAt: null });
		expect(view?.players[1]).toBeNull();
	});

	test("gives an empty seat the full time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: 45_000 });
		const view = await ada.query(get, { code });
		expect(view?.clock).toEqual({ remaining: [45_000, 45_000], turnedAt: null });
	});

	test("falls back to five minutes for a room without a stored time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			await ctx.db.patch(room._id, { time: undefined });
		});
		const view = await ada.query(get, { code });
		expect(view?.clock.remaining[1]).toBe(5 * 60_000);
	});

	test("reports when the running clock started", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(2_000_000);
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		expect((await a.query(get, { code }))?.clock.turnedAt).toBe(2_000_000);
	});

	test("reports the live round with no ended seat", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const view = await a.query(get, { code });
		expect(view?.status).toBe("active");
		expect(view?.game).toMatchObject({
			round: 1,
			latestRound: 1,
			isLive: true,
			endedSeat: null,
			reason: null
		});
	});

	test("reports which seat resigned", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		const view = await a.query(get, { code });
		expect(view?.game).toMatchObject({ endedSeat: 1, reason: "resign" });
	});

	test("shows a pinned past round as not live", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(rematch, { code });
		const view = await a.query(get, { code, round: 1 });
		expect(view?.game).toMatchObject({
			round: 1,
			latestRound: 2,
			isLive: false,
			reason: "resign"
		});
	});

	test("shows the newest round as live after a rematch", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(rematch, { code });
		const view = await a.query(get, { code });
		expect(view?.game).toMatchObject({ round: 2, latestRound: 2, isLive: true, reason: null });
	});

	test("reports a closed room's status", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		expect((await b.query(get, { code }))?.status).toBe("closed");
	});
});
