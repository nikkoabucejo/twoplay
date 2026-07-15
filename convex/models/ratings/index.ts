import type { Id } from "../../_generated/dataModel";
import { query, type MutationCtx, type QueryCtx } from "../../_generated/server";
import { requireUser } from "../rooms/auth.js";

/** Rating a user starts at the first time they finish a round of any game. */
export const DEFAULT_RATING = 400;
/** No rating ever drops below this, no matter how long a losing streak runs. */
export const MIN_RATING = 100;
/** Flat MMR step — every decisive round is worth exactly this many points, win or lose. */
const RATING_STEP = 8;
/** How many rows the leaderboard shows — highest ratings first. */
const TOP_LIMIT = 100;

async function ratingRow(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
	return await ctx.db
		.query("ratings")
		.withIndex("byUser", (q) => q.eq("userId", userId))
		.unique();
}

async function ensureRating(ctx: MutationCtx, userId: Id<"users">) {
	const existing = await ratingRow(ctx, userId);
	if (existing) return existing;

	const ratingId = await ctx.db.insert("ratings", { userId, rating: DEFAULT_RATING });
	return (await ctx.db.get(ratingId))!;
}

/** Settles one decisive round between two users' ratings — flat MMR, always +/- `RATING_STEP`,
 *  floored at `MIN_RATING`. One combined rating across every game on the platform. Never call this
 *  for a draw; a draw leaves both ratings untouched. Returns the signed change actually applied to
 *  each side, post-floor, so the caller can attach it to that round for display (e.g. "+8" / "-8"
 *  in history). */
export async function applyResult(
	ctx: MutationCtx,
	winnerUserId: Id<"users">,
	loserUserId: Id<"users">
) {
	const winner = await ensureRating(ctx, winnerUserId);
	const loser = await ensureRating(ctx, loserUserId);

	const nextWinnerRating = winner.rating + RATING_STEP;
	const nextLoserRating = Math.max(MIN_RATING, loser.rating - RATING_STEP);

	await ctx.db.patch(winner._id, { rating: nextWinnerRating });
	await ctx.db.patch(loser._id, { rating: nextLoserRating });

	return {
		winnerMmr: nextWinnerRating - winner.rating,
		loserMmr: nextLoserRating - loser.rating
	};
}

/** The caller's own rating, or `DEFAULT_RATING` if they haven't finished a round yet. */
export const mine = query({
	args: {},
	async handler(ctx) {
		const user = await requireUser(ctx);
		const row = await ratingRow(ctx, user._id);
		return row?.rating ?? DEFAULT_RATING;
	}
});

export type LeaderboardEntry = {
	userId: Id<"users">;
	name: string;
	rating: number;
	/** True for the row belonging to whoever's asking — lets the client highlight their own seat
	 *  in the list the same way `rooms.lobbies`/`rooms.history` flag `isOwn`. */
	isMe: boolean;
};

/** The top `TOP_LIMIT` users platform-wide by rating, highest first. */
export const top = query({
	args: {},
	async handler(ctx): Promise<LeaderboardEntry[]> {
		const user = await requireUser(ctx);

		const rows = await ctx.db.query("ratings").withIndex("byRating").order("desc").take(TOP_LIMIT);

		return await Promise.all(
			rows.map(async (row): Promise<LeaderboardEntry> => {
				const rowUser = await ctx.db.get(row.userId);
				return {
					userId: row.userId,
					name: rowUser?.name ?? "Unknown",
					rating: row.rating,
					isMe: row.userId === user._id
				};
			})
		);
	}
});
