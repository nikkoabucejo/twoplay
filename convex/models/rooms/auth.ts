import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { playerByUserAndRoom } from "../players/index.js";
import { userByClerkUserId } from "../users/index.js";

/** Split out of `rooms/index.ts` into this leaf module so `games/index.ts` and `players/index.ts`
 *  can depend on the room/player lookups and auth checks below without a circular import back to
 *  `rooms/index.ts` (which itself depends on `games/index.ts` for engine dispatch and
 *  `players/index.ts` for player lookups). Circular `mutation({ args: {...} })` validators evaluate
 *  eagerly at module load, unlike the plain function declarations here, so that cycle isn't safe the
 *  way this one is. */

/** The signed-in visitor's user row — throws if they're not signed in at all. */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error("Sign in to play");

	const user = await userByClerkUserId(ctx, identity.subject);
	if (!user) throw new Error("Sign in to play");

	return user;
}

/** The signed-in visitor's player row for this room, or `null` if they've never joined it — e.g. a
 *  spectator viewing a room's state or move history without playing in it. */
export async function currentPlayer(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
	const user = await requireUser(ctx);
	return await playerByUserAndRoom(ctx, user._id, roomId);
}

/** Like `currentPlayer`, but throws unless the visitor is actually seated in this room — game data
 *  references players, never users, directly. */
export async function requirePlayer(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
	const player = await currentPlayer(ctx, roomId);
	if (!player) throw new Error("You are not a player in this room");
	return player;
}

/** Codes are stored uppercase, so a typed or lowercased code still resolves. */
export async function getRoomByCode(ctx: QueryCtx | MutationCtx, code: string) {
	return await ctx.db
		.query("rooms")
		.withIndex("byCode", (q) => q.eq("code", code.trim().toUpperCase()))
		.unique();
}

/** Undefined `status` means active — only rooms created before this field existed lack it. */
export function isRoomActive(room: Pick<Doc<"rooms">, "status">): boolean {
	return room.status !== "closed";
}

/** The caller's currently active room, if any — the room from an unabandoned player row of theirs
 *  that hasn't itself closed. A user can have many player rows (one per room ever joined) but at
 *  most one should ever satisfy both conditions at once, since `create`/`join` funnel through this
 *  check before ever letting a second one exist. */
export async function getActiveRoomForUser(
	ctx: QueryCtx | MutationCtx,
	userId: Id<"users">
): Promise<Doc<"rooms"> | null> {
	const playerRows = await ctx.db
		.query("players")
		.withIndex("byUser", (q) => q.eq("userId", userId))
		.collect();

	for (const player of playerRows) {
		if (player.leftAt !== undefined) continue;
		const room = await ctx.db.get(player.roomId);
		if (room && isRoomActive(room)) return room;
	}
	return null;
}
