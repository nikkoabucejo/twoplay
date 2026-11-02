import { expect, test } from "vitest";
import { api } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode } from "../rooms/auth.js";
import { userByClerkUserId } from "../users/index.js";
import { applyResult, DEFAULT_RATING, MIN_RATING } from "./index.js";

const { mine, top } = api.models.ratings.index;

async function userIdOf(t: TestConvex, subject: string): Promise<Id<"users">> {
	const user = await t.run((ctx) => userByClerkUserId(ctx, subject));
	if (!user) throw new Error(`No user for ${subject}`);
	return user._id;
}

function setRating(t: TestConvex, userId: Id<"users">, rating: number) {
	return t.run((ctx) => ctx.db.insert("ratings", { userId, rating }));
}

function ratingRows(t: TestConvex) {
	return t.run((ctx) => ctx.db.query("ratings").collect());
}

/** Two signed-in users, plus their ids, ready to have a result applied between them. */
async function twoUsers(t: TestConvex) {
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	return { a, b, aId: await userIdOf(t, "user_a"), bId: await userIdOf(t, "user_b") };
}

/** Overwrites the room's live tictactoe board, so a round can be forced to a finished state. */
async function setBoards(t: TestConvex, code: string, boards: ("X" | "O" | null)[][]) {
	await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		const game = room && (await getCurrentGame(ctx, room._id));
		if (!game) throw new Error(`No live game in room ${code}`);
		await ctx.db.patch(game._id, { state: { kind: "tictactoe", boards } });
	});
}

const DRAWN_BOARD: ("X" | "O")[] = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
const X_WON_BOARD: ("X" | "O" | null)[] = ["X", "X", "X", null, null, null, null, null, null];

test("mine returns the default rating for a user who hasn't finished a round", async () => {
	const t = setup();
	const as = await signIn(t, "user_1");

	expect(await as.query(mine, {})).toBe(400);
});

test("mine returns the caller's stored rating", async () => {
	const t = setup();
	const as = await signIn(t, "user_1");
	await setRating(t, await userIdOf(t, "user_1"), 512);

	expect(await as.query(mine, {})).toBe(512);
});

test("mine rejects a signed-out caller", async () => {
	const t = setup();

	await expect(t.query(mine, {})).rejects.toThrow("Sign in to play");
});

test("mine rejects an identity with no stored user", async () => {
	const t = setup();

	await expect(t.withIdentity({ subject: "user_unstored" }).query(mine, {})).rejects.toThrow(
		"Sign in to play"
	);
});

test("applyResult moves two new users 8 points apart from the default", async () => {
	const t = setup();
	const { a, b, aId, bId } = await twoUsers(t);
	await t.run((ctx) => applyResult(ctx, aId, bId));

	expect(await a.query(mine, {})).toBe(408);
	expect(await b.query(mine, {})).toBe(392);
});

test("applyResult returns the signed change applied to each side", async () => {
	const t = setup();
	const { aId, bId } = await twoUsers(t);

	expect(await t.run((ctx) => applyResult(ctx, aId, bId))).toEqual({
		winnerMmr: 8,
		loserMmr: -8
	});
});

test("applyResult builds on existing ratings", async () => {
	const t = setup();
	const { a, b, aId, bId } = await twoUsers(t);
	await setRating(t, aId, 600);
	await setRating(t, bId, 700);
	await t.run((ctx) => applyResult(ctx, aId, bId));

	expect(await a.query(mine, {})).toBe(608);
	expect(await b.query(mine, {})).toBe(692);
});

test("applyResult keeps one rating row per user across rounds", async () => {
	const t = setup();
	const { aId, bId } = await twoUsers(t);
	await t.run((ctx) => applyResult(ctx, aId, bId));
	await t.run((ctx) => applyResult(ctx, bId, aId));
	await t.run((ctx) => applyResult(ctx, aId, bId));

	const rows = await ratingRows(t);
	expect(rows).toHaveLength(2);
	expect(rows.find((row) => row.userId === aId)?.rating).toBe(408);
	expect(rows.find((row) => row.userId === bId)?.rating).toBe(392);
});

test("applyResult floors the loser at 100 and reports only the points actually lost", async () => {
	const t = setup();
	const { b, aId, bId } = await twoUsers(t);
	await setRating(t, bId, 104);
	const change = await t.run((ctx) => applyResult(ctx, aId, bId));

	expect(await b.query(mine, {})).toBe(100);
	expect(change.loserMmr).toBe(-4);
});

test("applyResult leaves a loser already at the floor at 100", async () => {
	const t = setup();
	const { b, aId, bId } = await twoUsers(t);
	await setRating(t, bId, MIN_RATING);
	const change = await t.run((ctx) => applyResult(ctx, aId, bId));

	expect(await b.query(mine, {})).toBe(100);
	expect(change.loserMmr).toBe(0);
});

test("applyResult still awards the winner the full 8 when the loser is floored", async () => {
	const t = setup();
	const { a, aId, bId } = await twoUsers(t);
	await setRating(t, bId, MIN_RATING);
	const change = await t.run((ctx) => applyResult(ctx, aId, bId));

	expect(await a.query(mine, {})).toBe(408);
	expect(change.winnerMmr).toBe(8);
});

test("a drawn round leaves both ratings untouched", async () => {
	const t = setup();
	const { a, b, code } = await seatedRoom(t, "tictactoe");
	await setBoards(
		t,
		code,
		Array.from({ length: 9 }, () => DRAWN_BOARD)
	);
	await a.mutation(api.models.rooms.index.rematch, { code });

	expect(await ratingRows(t)).toHaveLength(0);
	expect(await a.query(mine, {})).toBe(DEFAULT_RATING);
	expect(await b.query(mine, {})).toBe(DEFAULT_RATING);
});

test("a decisive round moves the winner up 8 and the loser down 8", async () => {
	const t = setup();
	const { a, b, code } = await seatedRoom(t, "tictactoe");
	const empty = Array<"X" | "O" | null>(9).fill(null);
	await setBoards(t, code, [X_WON_BOARD, X_WON_BOARD, X_WON_BOARD, ...Array(6).fill(empty)]);
	await b.mutation(api.models.rooms.index.rematch, { code });

	expect(await a.query(mine, {})).toBe(408);
	expect(await b.query(mine, {})).toBe(392);
});

test("top lists ratings highest first", async () => {
	const t = setup();
	const { a, aId, bId } = await twoUsers(t);
	await signIn(t, "user_c", "Cy");
	const cId = await userIdOf(t, "user_c");
	await setRating(t, aId, 410);
	await setRating(t, bId, 900);
	await setRating(t, cId, 120);

	const entries = await a.query(top, {});
	expect(entries.map((entry) => [entry.name, entry.rating])).toEqual([
		["Bea", 900],
		["Ada", 410],
		["Cy", 120]
	]);
});

test("top flags only the caller's own row as isMe", async () => {
	const t = setup();
	const { b, aId, bId } = await twoUsers(t);
	await setRating(t, aId, 500);
	await setRating(t, bId, 450);

	const entries = await b.query(top, {});
	expect(entries.map((entry) => [entry.userId, entry.isMe])).toEqual([
		[aId, false],
		[bId, true]
	]);
});

test("top leaves out users who haven't finished a round", async () => {
	const t = setup();
	const { a, aId } = await twoUsers(t);
	await setRating(t, aId, 500);

	expect((await a.query(top, {})).map((entry) => entry.userId)).toEqual([aId]);
});

test("top names a row whose user no longer exists Unknown", async () => {
	const t = setup();
	const { a, bId } = await twoUsers(t);
	await setRating(t, bId, 500);
	await t.run((ctx) => ctx.db.delete(bId));

	expect((await a.query(top, {}))[0]).toMatchObject({ name: "Unknown", rating: 500, isMe: false });
});

test("top returns at most the 100 highest ratings", async () => {
	const t = setup();
	const as = await signIn(t, "user_1");
	await t.run(async (ctx) => {
		for (let i = 0; i < 105; i++) {
			const userId = await ctx.db.insert("users", { name: `P${i}`, clerk__userId: `seed_${i}` });
			await ctx.db.insert("ratings", { userId, rating: 1000 + i });
		}
	});

	const entries = await as.query(top, {});
	expect(entries).toHaveLength(100);
	expect(entries[0].rating).toBe(1104);
	expect(entries[99].rating).toBe(1005);
});

test("top rejects a signed-out caller", async () => {
	const t = setup();

	await expect(t.query(top, {})).rejects.toThrow("Sign in to play");
});
