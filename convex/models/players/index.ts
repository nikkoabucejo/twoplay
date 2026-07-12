import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function playerByUserId(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
	return await ctx.db
		.query("players")
		.withIndex("byUserId", (q) => q.eq("userId", userId))
		.unique();
}

/** Gets a user's player, creating one the first time they're seen and keeping its name in sync
 *  with the user's on every call after that (see `users.store`). */
export async function ensurePlayer(ctx: MutationCtx, userId: Id<"users">, name: string) {
	const existing = await playerByUserId(ctx, userId);
	if (existing) {
		if (existing.name !== name) await ctx.db.patch(existing._id, { name });
		return { ...existing, name };
	}

	const playerId = await ctx.db.insert("players", { userId, name });
	return (await ctx.db.get(playerId))!;
}
