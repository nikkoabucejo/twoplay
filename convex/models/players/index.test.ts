import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getRoomByCode } from "../rooms/auth.js";
import { userByClerkUserId } from "../users/index.js";
import { DEFAULT_EMOJI, ensurePlayer, playerByUserAndRoom } from "./index.js";

const { trashtalk, heartbeat } = api.models.players.index;

afterEach(() => {
	vi.useRealTimers();
});

function idsOf(t: TestConvex, subject: string, code: string) {
	return t.run(async (ctx) => {
		const user = await userByClerkUserId(ctx, subject);
		const room = await getRoomByCode(ctx, code);
		if (!user || !room) throw new Error(`Missing user ${subject} or room ${code}`);
		return { userId: user._id, roomId: room._id };
	});
}

/** The player row for `subject` in the room with `code`, or null if they have none. */
async function seatOf(t: TestConvex, subject: string, code: string) {
	const { userId, roomId } = await idsOf(t, subject, code);
	return await t.run((ctx) => playerByUserAndRoom(ctx, userId, roomId));
}

function countPlayers(t: TestConvex) {
	return t.run(async (ctx) => (await ctx.db.query("players").collect()).length);
}

test("playerByUserAndRoom returns the user's seat in that room", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");

	expect(await seatOf(t, "user_a", code)).toMatchObject({ name: "Ada" });
});

test("playerByUserAndRoom returns null for a user with no seat in the room", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");
	await signIn(t, "user_c", "Cy");

	expect(await seatOf(t, "user_c", code)).toBeNull();
});

test("ensurePlayer creates a seat with the name snapshot, zero score, and default emoji", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");
	await signIn(t, "user_c", "Cy");

	const { userId, roomId } = await idsOf(t, "user_c", code);
	const player = await t.run((ctx) => ensurePlayer(ctx, userId, roomId, "Cy"));

	expect(player).toMatchObject({ name: "Cy", score: 0, emoji: DEFAULT_EMOJI });
	expect(player.leftAt).toBeUndefined();
	expect(player.seenAt).toBeUndefined();
});

test("ensurePlayer returns the existing seat instead of creating a second one", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");
	const before = await seatOf(t, "user_a", code);

	const { userId, roomId } = await idsOf(t, "user_a", code);
	const again = await t.run((ctx) => ensurePlayer(ctx, userId, roomId, "Someone Else"));

	expect(again).toEqual(before);
	expect(await countPlayers(t)).toBe(2);
});

test("a rename does not change the name on a seat already taken", async () => {
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(api.models.users.index.store, { name: "Ada Lovelace" });

	expect((await seatOf(t, "user_a", code))?.name).toBe("Ada");
});

test("trashtalk sets the caller's emoji in that room", async () => {
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(trashtalk, { code, emoji: "1f525" });

	expect((await seatOf(t, "user_a", code))?.emoji).toBe("1f525");
});

test("trashtalk leaves the opponent's emoji alone", async () => {
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(trashtalk, { code, emoji: "1f525" });

	expect((await seatOf(t, "user_b", code))?.emoji).toBe(DEFAULT_EMOJI);
});

test("trashtalk rejects an unknown room", async () => {
	const t = setup();
	const as = await signIn(t, "user_1");

	await expect(as.mutation(trashtalk, { code: "NOPE42", emoji: "1f525" })).rejects.toThrow(
		"Room not found"
	);
});

test("trashtalk rejects a caller who isn't seated in the room", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");
	const spectator = await signIn(t, "user_c", "Cy");

	await expect(spectator.mutation(trashtalk, { code, emoji: "1f525" })).rejects.toThrow(
		"You are not a player in this room"
	);
});

test("trashtalk rejects a signed-out caller", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");

	await expect(t.mutation(trashtalk, { code, emoji: "1f525" })).rejects.toThrow("Sign in to play");
});

test("trashtalk rejects an identity with no stored user", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");
	const unstored = t.withIdentity({ subject: "user_unstored" });

	await expect(unstored.mutation(trashtalk, { code, emoji: "1f525" })).rejects.toThrow(
		"Sign in to play"
	);
});

test.fails("trashtalk rejects an emoji that isn't a hex codepoint", async () => {
	// Accepts any string, which opponents interpolate into the Noto Lottie asset URL.
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");

	await expect(a.mutation(trashtalk, { code, emoji: "../../evil" })).rejects.toThrow();
});

test("heartbeat records the current time as the caller's seenAt", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(heartbeat, { code });

	expect((await seatOf(t, "user_a", code))?.seenAt).toBe(Date.parse("2026-01-01T12:00:00Z"));
});

test("heartbeat leaves the opponent's seenAt alone", async () => {
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(heartbeat, { code });

	expect((await seatOf(t, "user_b", code))?.seenAt).toBeUndefined();
});

test("heartbeat advances seenAt on each call", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(heartbeat, { code });
	vi.setSystemTime(new Date("2026-01-01T12:00:30Z"));
	await a.mutation(heartbeat, { code });

	expect((await seatOf(t, "user_a", code))?.seenAt).toBe(Date.parse("2026-01-01T12:00:30Z"));
});

test("heartbeat ignores an unknown room", async () => {
	const t = setup();
	const as = await signIn(t, "user_1");

	await expect(as.mutation(heartbeat, { code: "NOPE42" })).resolves.toBeNull();
});

test("heartbeat ignores a spectator without creating a seat", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");
	const spectator = await signIn(t, "user_c", "Cy");
	await spectator.mutation(heartbeat, { code });

	expect(await seatOf(t, "user_c", code)).toBeNull();
	expect(await countPlayers(t)).toBe(2);
});

test("heartbeat ignores a player who has abandoned the room", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(heartbeat, { code });
	await a.mutation(api.models.rooms.index.abandon, { code });
	vi.setSystemTime(new Date("2026-01-01T12:05:00Z"));
	await a.mutation(heartbeat, { code });

	expect((await seatOf(t, "user_a", code))?.seenAt).toBe(Date.parse("2026-01-01T12:00:00Z"));
});

test("heartbeat rejects a signed-out caller", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");

	await expect(t.mutation(heartbeat, { code })).rejects.toThrow("Sign in to play");
});
