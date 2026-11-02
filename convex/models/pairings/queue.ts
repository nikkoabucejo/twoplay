import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

/** Queue helpers for `rooms/index.ts`, which can't import `pairings/index.ts`: that module imports
 *  `rooms/index.ts`, and both define validators that evaluate at module load. */

export async function pairingByUser(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
	return await ctx.db
		.query("pairings")
		.withIndex("byUser", (q) => q.eq("userId", userId))
		.unique();
}

/** Deletes the user's queue entry, expired or not. A no-op when they aren't queued. */
export async function leaveQueue(ctx: MutationCtx, userId: Id<"users">) {
	const entry = await pairingByUser(ctx, userId);
	if (entry) await ctx.db.delete(entry._id);
}
