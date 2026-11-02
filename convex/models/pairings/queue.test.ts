import { describe, expect, test } from "vitest";
import type { Id } from "../../_generated/dataModel.js";
import { setup, signIn, type TestConvex } from "../../test.setup.js";
import { userByClerkUserId } from "../users/index.js";
import { leaveQueue, pairingByUser } from "./queue.js";

async function userIdOf(t: TestConvex, subject: string): Promise<Id<"users">> {
	await signIn(t, subject);
	const user = await t.run((ctx) => userByClerkUserId(ctx, subject));
	if (!user) throw new Error(`No user for ${subject}`);
	return user._id;
}

async function queue(t: TestConvex, userId: Id<"users">, expiredAt?: number) {
	await t.run((ctx) =>
		ctx.db.insert("pairings", { userId, type: "tictactoe", time: 300_000, expiredAt })
	);
}

describe("pairingByUser", () => {
	test("returns the user's queue entry", async () => {
		const t = setup();
		const userId = await userIdOf(t, "user_a");
		await queue(t, userId);
		expect(await t.run((ctx) => pairingByUser(ctx, userId))).toMatchObject({
			userId,
			type: "tictactoe"
		});
	});

	test("returns null for a user who isn't queued", async () => {
		const t = setup();
		const userId = await userIdOf(t, "user_a");
		expect(await t.run((ctx) => pairingByUser(ctx, userId))).toBeNull();
	});
});

describe("leaveQueue", () => {
	test("deletes a waiting entry", async () => {
		const t = setup();
		const userId = await userIdOf(t, "user_a");
		await queue(t, userId);
		await t.run((ctx) => leaveQueue(ctx, userId));
		expect(await t.run((ctx) => pairingByUser(ctx, userId))).toBeNull();
	});

	test("deletes an expired entry", async () => {
		const t = setup();
		const userId = await userIdOf(t, "user_a");
		await queue(t, userId, 1_000);
		await t.run((ctx) => leaveQueue(ctx, userId));
		expect(await t.run((ctx) => pairingByUser(ctx, userId))).toBeNull();
	});

	test("leaves other users' entries alone when the user isn't queued", async () => {
		const t = setup();
		const userId = await userIdOf(t, "user_a");
		const otherId = await userIdOf(t, "user_b");
		await queue(t, otherId);
		await t.run((ctx) => leaveQueue(ctx, userId));
		expect(await t.run((ctx) => ctx.db.query("pairings").collect())).toHaveLength(1);
	});
});
