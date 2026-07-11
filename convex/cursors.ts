import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getRoomByCode, requireUser } from "./rooms.js";
import { userByClerkUserId } from "./users.js";

export const update = mutation({
	args: { code: v.string(), x: v.number(), y: v.number() },
	async handler(ctx, { code, x, y }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		if (!room.players.includes(user._id)) throw new Error("You are not a player in this room");

		const existing = await ctx.db
			.query("cursors")
			.withIndex("byRoomAndUser", (q) => q.eq("roomId", room._id).eq("userId", user._id))
			.unique();

		const patch = { x, y, updatedAt: Date.now() };
		if (existing) {
			await ctx.db.patch(existing._id, patch);
		} else {
			await ctx.db.insert("cursors", { roomId: room._id, userId: user._id, ...patch });
		}
	}
});

export const clear = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) return;

		const existing = await ctx.db
			.query("cursors")
			.withIndex("byRoomAndUser", (q) => q.eq("roomId", room._id).eq("userId", user._id))
			.unique();
		if (existing) await ctx.db.delete(existing._id);
	}
});

export const list = query({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) return [];

		const identity = await ctx.auth.getUserIdentity();
		const viewer = identity ? await userByClerkUserId(ctx, identity.subject) : null;

		const cursors = await ctx.db
			.query("cursors")
			.withIndex("byRoom", (q) => q.eq("roomId", room._id))
			.collect();

		return await Promise.all(
			cursors
				.filter((cursor) => cursor.userId !== viewer?._id)
				.map(async (cursor) => {
					const player = await ctx.db.get(cursor.userId);
					return {
						userId: cursor.userId,
						name: player?.name ?? "Player",
						index: room.players.indexOf(cursor.userId),
						x: cursor.x,
						y: cursor.y,
						updatedAt: cursor.updatedAt
					};
				})
		);
	}
});
