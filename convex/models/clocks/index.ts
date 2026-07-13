import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function clocksByGame(ctx: QueryCtx | MutationCtx, gameId: Id<"games">) {
	return await ctx.db
		.query("clocks")
		.withIndex("byGame", (q) => q.eq("gameId", gameId))
		.collect();
}

export async function clockByGameAndPlayer(
	ctx: QueryCtx | MutationCtx,
	gameId: Id<"games">,
	playerId: Id<"players">
) {
	return await ctx.db
		.query("clocks")
		.withIndex("byGameAndPlayer", (q) => q.eq("gameId", gameId).eq("playerId", playerId))
		.unique();
}
