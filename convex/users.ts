import { v } from "convex/values";
import { mutation, type QueryCtx } from "./_generated/server";

export const store = mutation({
	args: { name: v.string() },
	async handler(ctx, { name }) {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Called store without authentication present");

		const user = await userByClerkUserId(ctx, identity.subject);

		if (user === null) {
			await ctx.db.insert("users", { name, clerk__userId: identity.subject });
		} else if (user.name !== name) {
			await ctx.db.patch(user._id, { name });
		}
	}
});

export async function userByClerkUserId(ctx: QueryCtx, clerkUserId: string) {
	return await ctx.db
		.query("users")
		.withIndex("byClerkUserId", (q) => q.eq("clerk__userId", clerkUserId))
		.unique();
}
