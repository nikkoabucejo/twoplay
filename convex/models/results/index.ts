import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function resultsByGame(ctx: QueryCtx | MutationCtx, gameId: Id<"games">) {
	return await ctx.db
		.query("results")
		.withIndex("byGame", (q) => q.eq("gameId", gameId))
		.collect();
}

export async function resultByGameAndPlayer(
	ctx: QueryCtx | MutationCtx,
	gameId: Id<"games">,
	playerId: Id<"players">
) {
	return await ctx.db
		.query("results")
		.withIndex("byGameAndPlayer", (q) => q.eq("gameId", gameId).eq("playerId", playerId))
		.unique();
}

export type ResultState = NonNullable<Doc<"results">["state"]>;

/** Marks this player's round as ended for the given cause — inserts a fresh row, or patches an
 *  existing one so a later `creditMmr` call for the same player still lands on the one row rather
 *  than a duplicate. Never called for a natural win/loss/draw. */
export async function markEnded(
	ctx: MutationCtx,
	gameId: Id<"games">,
	playerId: Id<"players">,
	state: ResultState
) {
	const existing = await resultByGameAndPlayer(ctx, gameId, playerId);
	if (existing) {
		await ctx.db.patch(existing._id, { state });
		return;
	}
	await ctx.db.insert("results", { gameId, playerId, state });
}

/** Records the MMR change settled for this player this round — patches the row `markEnded` may have
 *  already created for a resign/timeout/abandon, or inserts a fresh one otherwise (a natural win/loss
 *  never goes through `markEnded`, and the winning side of any decisive round never does either). */
export async function creditMmr(
	ctx: MutationCtx,
	gameId: Id<"games">,
	playerId: Id<"players">,
	mmr: number
) {
	const existing = await resultByGameAndPlayer(ctx, gameId, playerId);
	if (existing) {
		await ctx.db.patch(existing._id, { mmr });
		return;
	}
	await ctx.db.insert("results", { gameId, playerId, mmr });
}
