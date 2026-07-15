import { v } from "convex/values";
import { internalMutation, mutation, query } from "../../_generated/server";
import { createGame, gameTypeValidator, type GameType } from "../games/index.js";
import { ensurePlayer } from "../players/index.js";
import { getActiveRoomForUser, requireUser } from "../rooms/auth.js";
import { generateRoomCode, resolveTimeControlMs } from "../rooms/index.js";

/** A queue entry with nobody left to claim it gets swept after this long — e.g. a tab closed while
 *  still waiting. Keeps a long-dead entry from sitting around as a phantom opponent forever. */
const QUEUE_ENTRY_TIMEOUT_MS = 5 * 60_000;

export type PairingResult =
	| { status: "waiting" }
	| { status: "matched"; code: string; type: GameType };

/** Joins the pairing queue for `type`, or immediately pairs with the longest-waiting opponent
 *  already queued for it. The room this creates adopts that opponent's chosen time control — they
 *  committed to it first, so the newcomer's own pick only applies if they end up waiting instead. */
export const enqueue = mutation({
	args: { type: gameTypeValidator, timeControlMs: v.optional(v.number()) },
	async handler(ctx, { type, timeControlMs }): Promise<PairingResult> {
		const user = await requireUser(ctx);

		const activeRoom = await getActiveRoomForUser(ctx, user._id);
		if (activeRoom) return { status: "matched", code: activeRoom.code, type: activeRoom.type };

		const existing = await ctx.db
			.query("pairings")
			.withIndex("byUser", (q) => q.eq("userId", user._id))
			.unique();
		if (existing) return { status: "waiting" };

		const opponentEntry = await ctx.db
			.query("pairings")
			.withIndex("byType", (q) => q.eq("type", type))
			.first();

		if (!opponentEntry) {
			await ctx.db.insert("pairings", {
				userId: user._id,
				type,
				time: resolveTimeControlMs(timeControlMs)
			});
			return { status: "waiting" };
		}

		await ctx.db.delete(opponentEntry._id);

		const opponentUser = await ctx.db.get(opponentEntry.userId);
		if (!opponentUser) {
			// The waiting user's account vanished between queueing and being claimed — nothing to pair
			// with, so fall back to queueing the caller themselves instead of pairing with a ghost.
			await ctx.db.insert("pairings", {
				userId: user._id,
				type,
				time: resolveTimeControlMs(timeControlMs)
			});
			return { status: "waiting" };
		}

		const code = await generateRoomCode(ctx);
		const roomId = await ctx.db.insert("rooms", {
			code,
			type,
			players: [],
			time: opponentEntry.time,
			visibility: "private",
			status: "active"
		});

		const opponentPlayer = await ensurePlayer(ctx, opponentEntry.userId, roomId, opponentUser.name);
		const player = await ensurePlayer(ctx, user._id, roomId, user.name);
		const players = [opponentPlayer._id, player._id];
		await ctx.db.patch(roomId, { players });
		await createGame(ctx, { _id: roomId, type, players }, opponentEntry.time, true);

		return { status: "matched", code, type };
	}
});

/** Leaves the pairing queue. A no-op if the caller isn't currently waiting — e.g. they'd already
 *  been matched, or never queued in the first place. */
export const cancel = mutation({
	args: {},
	async handler(ctx) {
		const user = await requireUser(ctx);
		const existing = await ctx.db
			.query("pairings")
			.withIndex("byUser", (q) => q.eq("userId", user._id))
			.unique();
		if (existing) await ctx.db.delete(existing._id);
	}
});

/** Whether the caller currently has a queue entry waiting to be matched — powers the "waiting for an
 *  opponent" state client-side. Reactive, so it flips to `false` on its own the moment another player
 *  claims the entry, without the client needing to poll anything. */
export const status = query({
	args: {},
	async handler(ctx): Promise<boolean> {
		const user = await requireUser(ctx);
		const existing = await ctx.db
			.query("pairings")
			.withIndex("byUser", (q) => q.eq("userId", user._id))
			.unique();
		return existing !== null;
	}
});

/** Clears queue entries nobody ever claimed — see `crons.ts`. */
export const sweep = internalMutation({
	args: {},
	async handler(ctx) {
		const now = Date.now();
		const entries = await ctx.db.query("pairings").collect();
		for (const entry of entries) {
			if (now - entry._creationTime > QUEUE_ENTRY_TIMEOUT_MS) await ctx.db.delete(entry._id);
		}
	}
});
