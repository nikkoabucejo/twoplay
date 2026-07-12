import { v } from "convex/values";
import { mutation, type QueryCtx } from "../../_generated/server";
import { ensurePlayer } from "../players/index.js";

const MAX_NAME_LENGTH = 100;

export const store = mutation({
	args: { name: v.string() },
	async handler(ctx, { name }) {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Called store without authentication present");

		const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
		if (!trimmed) throw new Error("Name can't be empty");

		const existing = await userByClerkUserId(ctx, identity.subject);

		const userId =
			existing === null
				? await ctx.db.insert("users", { name: trimmed, clerk__userId: identity.subject })
				: existing._id;

		if (existing && existing.name !== trimmed) {
			await ctx.db.patch(existing._id, { name: trimmed });
		}

		// Ensures a player exists both for a brand-new user and for one that predates this table,
		// and keeps its name mirroring the user's.
		await ensurePlayer(ctx, userId, trimmed);
	}
});

export async function userByClerkUserId(ctx: QueryCtx, clerkUserId: string) {
	return await ctx.db
		.query("users")
		.withIndex("byClerkUserId", (q) => q.eq("clerk__userId", clerkUserId))
		.unique();
}
