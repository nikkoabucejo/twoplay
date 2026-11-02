import { v } from "convex/values";
import { internalMutation, mutation, query } from "../../_generated/server";
import { createGame, gameTypeValidator, type GameType } from "../games/index.js";
import { ensurePlayer } from "../players/index.js";
import { getActiveRoomForUser, requireUser } from "../rooms/auth.js";
import { resolveTimeControlMs } from "../rooms/constants.js";
import { generateRoomCode } from "../rooms/index.js";
import { leaveQueue, pairingByUser } from "./queue.js";

/** A queue entry with nobody left to claim it gets swept after this long — e.g. a tab closed while
 *  still waiting. Keeps a long-dead entry from sitting around as a phantom opponent forever. */
const QUEUE_ENTRY_TIMEOUT_MS = 5 * 60_000;
/** How long an expired entry stays so its owner can be told the search expired. */
const EXPIRED_RETENTION_MS = 60 * 60_000;
/** How many waiting entries one `enqueue` checks. Each stale one it meets is deleted, so the next
 *  call reaches further. */
const MATCH_SCAN_LIMIT = 20;

export type PairingResult =
	{ status: "waiting" } | { status: "matched"; code: string; type: GameType };

/** Joins the pairing queue for `type`, or immediately pairs with the longest-waiting opponent
 *  already queued for it. The room this creates adopts that opponent's chosen time control — they
 *  committed to it first, so the newcomer's own pick only applies if they end up waiting instead. */
export const enqueue = mutation({
	args: { type: gameTypeValidator, timeControlMs: v.optional(v.number()) },
	async handler(ctx, { type, timeControlMs }): Promise<PairingResult> {
		const user = await requireUser(ctx);

		const activeRoom = await getActiveRoomForUser(ctx, user._id);
		if (activeRoom) {
			await leaveQueue(ctx, user._id);
			return { status: "matched", code: activeRoom.code, type: activeRoom.type };
		}

		const existing = await pairingByUser(ctx, user._id);
		if (existing) {
			if (existing.expiredAt === undefined) return { status: "waiting" };
			await ctx.db.delete(existing._id);
		}

		const entries = await ctx.db
			.query("pairings")
			.withIndex("byTypeAndExpired", (q) => q.eq("type", type).eq("expiredAt", undefined))
			.take(MATCH_SCAN_LIMIT);
		for (const opponentEntry of entries) {
			// Spent whether it pairs or not: a missing user can't play, and a user already in a room
			// would end up seated twice.
			await ctx.db.delete(opponentEntry._id);
			const opponentUser = await ctx.db.get(opponentEntry.userId);
			if (!opponentUser || (await getActiveRoomForUser(ctx, opponentUser._id))) continue;

			const code = await generateRoomCode(ctx);
			const roomId = await ctx.db.insert("rooms", {
				code,
				type,
				players: [],
				time: opponentEntry.time,
				visibility: "private",
				status: "active"
			});

			const opponentPlayer = await ensurePlayer(
				ctx,
				opponentEntry.userId,
				roomId,
				opponentUser.name
			);
			const player = await ensurePlayer(ctx, user._id, roomId, user.name);
			const players = [opponentPlayer._id, player._id];
			await ctx.db.patch(roomId, { players });
			await createGame(ctx, { _id: roomId, type, players }, opponentEntry.time, true);

			return { status: "matched", code, type };
		}

		await ctx.db.insert("pairings", {
			userId: user._id,
			type,
			time: resolveTimeControlMs(timeControlMs)
		});
		return { status: "waiting" };
	}
});

/** Leaves the pairing queue. A no-op if the caller isn't currently waiting — e.g. they'd already
 *  been matched, or never queued in the first place. */
export const cancel = mutation({
	args: {},
	async handler(ctx) {
		const user = await requireUser(ctx);
		await leaveQueue(ctx, user._id);
	}
});

/** Whether the caller currently has a queue entry waiting to be matched — powers the "waiting for an
 *  opponent" state client-side. Reactive, so it flips to `false` on its own the moment another player
 *  claims the entry, or the sweep expires it, without the client needing to poll anything. */
export const status = query({
	args: {},
	async handler(ctx): Promise<boolean> {
		const user = await requireUser(ctx);
		const existing = await pairingByUser(ctx, user._id);
		return existing !== null && existing.expiredAt === undefined;
	}
});

/** Whether the caller's own search expired before anyone claimed it. */
export const expired = query({
	args: {},
	async handler(ctx): Promise<boolean> {
		const user = await requireUser(ctx);
		const existing = await pairingByUser(ctx, user._id);
		return existing?.expiredAt !== undefined;
	}
});

/** Expires queue entries nobody claimed in time, and deletes ones expired long enough ago that
 *  their owner has had the chance to see it — see `crons.ts`. */
export const sweep = internalMutation({
	args: {},
	async handler(ctx) {
		const now = Date.now();
		const entries = await ctx.db.query("pairings").collect();
		for (const entry of entries) {
			if (entry.expiredAt === undefined) {
				if (now - entry._creationTime > QUEUE_ENTRY_TIMEOUT_MS) {
					await ctx.db.patch(entry._id, { expiredAt: now });
				}
			} else if (now - entry.expiredAt > EXPIRED_RETENTION_MS) {
				await ctx.db.delete(entry._id);
			}
		}
	}
});
