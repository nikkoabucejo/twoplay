import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation, type MutationCtx, type QueryCtx } from "../../_generated/server";
import { getRoomByCode, requirePlayer } from "../rooms/auth.js";

export const DEFAULT_EMOJI = "1f600";

export async function playerByUserAndRoom(
	ctx: QueryCtx | MutationCtx,
	userId: Id<"users">,
	roomId: Id<"rooms">
) {
	return await ctx.db
		.query("players")
		.withIndex("byUserAndRoom", (q) => q.eq("userId", userId).eq("roomId", roomId))
		.unique();
}

/** Gets a user's player row for this room, creating one — snapshotting their current name — the
 *  first time they're seen in it. */
export async function ensurePlayer(
	ctx: MutationCtx,
	userId: Id<"users">,
	roomId: Id<"rooms">,
	name: string
) {
	const existing = await playerByUserAndRoom(ctx, userId, roomId);
	if (existing) return existing;

	const playerId = await ctx.db.insert("players", {
		userId,
		roomId,
		name,
		score: 0,
		emoji: DEFAULT_EMOJI
	});
	return (await ctx.db.get(playerId))!;
}

/** Changes the caller's own status-bar emoji — lives on the player row, scoped to this room, not the
 *  user's identity, so the same person can pick differently in a different room. */
export const trashtalk = mutation({
	args: { code: v.string(), emoji: v.string() },
	async handler(ctx, { code, emoji }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		const player = await requirePlayer(ctx, room._id);
		await ctx.db.patch(player._id, { emoji });
	}
});
