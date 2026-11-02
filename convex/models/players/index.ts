import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation, type MutationCtx, type QueryCtx } from "../../_generated/server";
import { currentPlayer, getRoomByCode, isRoomActive, requirePlayer } from "../rooms/auth.js";
import { DEFAULT_EMOJI, TRASHTALK_EMOJIS } from "./constants.js";

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
		if (!isRoomActive(room) || player.leftAt !== undefined) {
			throw new Error("This room is no longer active");
		}
		if (!TRASHTALK_EMOJIS.includes(emoji)) throw new Error("Unknown emoji");
		await ctx.db.patch(player._id, { emoji });
	}
});

/** Records that the caller is still present in this room — a cheap patch on their existing row,
 *  called periodically while the room's tab is open. Powers the opponent "disconnected" indicator
 *  and the idle-room sweep. Silently does nothing for a spectator (no player row yet) or a player
 *  who has already abandoned — never throws, since it's a fire-and-forget background call. */
export const heartbeat = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) return;

		const player = await currentPlayer(ctx, room._id);
		if (!player || player.leftAt !== undefined) return;

		await ctx.db.patch(player._id, { seenAt: Date.now() });
	}
});
