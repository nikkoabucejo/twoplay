import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	internalMutation,
	mutation,
	query,
	type MutationCtx,
	type QueryCtx
} from "../../_generated/server";
import { clockByGameAndPlayer, clocksByGame } from "../clocks/index.js";
import { otherPlayer } from "../games/engine.js";
import {
	applyMove,
	countMoves,
	createGame,
	gameMoveValidator,
	gameStatus,
	gameTypeValidator,
	getCurrentGame,
	getEngine,
	getGame,
	roundWinner,
	type GameType
} from "../games/index.js";
import { ensurePlayer, playerByUserAndRoom } from "../players/index.js";
import { applyResult } from "../ratings/index.js";
import { creditMmr, markEnded, resultsByGame } from "../results/index.js";
import {
	currentPlayer,
	getActiveRoomForUser,
	getRoomByCode,
	isRoomActive,
	requirePlayer,
	requireUser
} from "./auth.js";
import { roomVisibilityValidator } from "./schema.js";

export { currentPlayer, getRoomByCode, isRoomActive, requirePlayer, requireUser };

/** A room with no opponent ever joining gets swept after this long. */
const EMPTY_ROOM_TIMEOUT_MS = 45 * 60_000;
/** A single silent seat gets auto-abandoned in the other seat's favor after this long. */
const AUTO_ABANDON_MS = 4 * 60_000;

const CODE_LENGTH = 6;
// No 0/O/1/I/L — avoids ambiguous shared-code typos.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Per-player starting clock bank when a room doesn't specify its own time control. */
export const DEFAULT_TIME_CONTROL_MS = 5 * 60_000;
const MIN_TIME_CONTROL_MS = 10_000;
const MAX_TIME_CONTROL_MS = 60 * 60_000;

/** Clamps a client-supplied time control into a sane range — a raw client value could otherwise be
 *  zero/negative (instant loss for whoever moves first) or `NaN` (silently disables timeouts). */
export function resolveTimeControlMs(timeControlMs: number | undefined): number {
	if (timeControlMs === undefined || !Number.isFinite(timeControlMs))
		return DEFAULT_TIME_CONTROL_MS;
	return Math.min(MAX_TIME_CONTROL_MS, Math.max(MIN_TIME_CONTROL_MS, timeControlMs));
}

export async function generateRoomCode(ctx: MutationCtx): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		let code = "";
		for (let i = 0; i < CODE_LENGTH; i++) {
			code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
		}
		if (!(await getRoomByCode(ctx, code))) return code;
	}
	throw new Error("Could not generate a unique room code, please try again");
}

export type RoomEntryResult = { code: string; type: GameType; redirected: boolean };

export const create = mutation({
	args: {
		type: gameTypeValidator,
		timeControlMs: v.optional(v.number()),
		visibility: v.optional(roomVisibilityValidator)
	},
	async handler(ctx, { type, timeControlMs, visibility }): Promise<RoomEntryResult> {
		const user = await requireUser(ctx);
		const activeRoom = await getActiveRoomForUser(ctx, user._id);
		if (activeRoom) return { code: activeRoom.code, type: activeRoom.type, redirected: true };

		const code = await generateRoomCode(ctx);
		const resolvedTimeControlMs = resolveTimeControlMs(timeControlMs);
		const roomId = await ctx.db.insert("rooms", {
			code,
			type,
			players: [],
			time: resolvedTimeControlMs,
			visibility: visibility ?? "private",
			status: "active"
		});
		const player = await ensurePlayer(ctx, user._id, roomId, user.name);
		await ctx.db.patch(roomId, { players: [player._id] });
		await createGame(
			ctx,
			{ _id: roomId, type, players: [player._id] },
			resolvedTimeControlMs,
			false
		);
		return { code, type, redirected: false };
	}
});

export const join = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }): Promise<RoomEntryResult> {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		const user = await requireUser(ctx);
		// Re-navigating to a room you already have a seat in — whether still active or long since
		// abandoned — is just viewing it, never a fresh join. Closed rooms stay fully visible in
		// history (see `abandon`), so a former seat here is a no-op rather than an error.
		const existing = await playerByUserAndRoom(ctx, user._id, room._id);
		if (existing) return { code: room.code, type: room.type, redirected: false };

		if (!isRoomActive(room)) throw new Error("This room is no longer active");
		const activeRoom = await getActiveRoomForUser(ctx, user._id);
		if (activeRoom && activeRoom._id !== room._id) {
			return { code: activeRoom.code, type: activeRoom.type, redirected: true };
		}

		const engine = getEngine(room.type);
		if (room.players.length >= engine.playerCount) throw new Error("Room is full");

		const player = await ensurePlayer(ctx, user._id, room._id, user.name);
		const players = [...room.players, player._id];
		await ctx.db.patch(room._id, { players });

		// The newcomer's seat had no clock row yet (only seats filled at game-creation time get one) —
		// create it now, and start whichever seat is due to move once every seat is finally filled.
		const game = await getCurrentGame(ctx, room._id);
		if (game) {
			const timeControlMs = room.time ?? DEFAULT_TIME_CONTROL_MS;
			await ctx.db.insert("clocks", {
				gameId: game._id,
				playerId: player._id,
				remaining: timeControlMs
			});

			if (players.length >= engine.playerCount) {
				const status = gameStatus(room.type, game.state);
				const activePlayerId = status && players[status.turnIndex];
				const activeClock =
					activePlayerId && (await clockByGameAndPlayer(ctx, game._id, activePlayerId));
				if (activeClock && activeClock.turnedAt === undefined) {
					await ctx.db.patch(activeClock._id, { turnedAt: Date.now() });
				}
			}
		}

		return { code: room.code, type: room.type, redirected: false };
	}
});

/** The caller's currently active room, if any — lets the lobby redirect before Create/Join is even
 *  clicked, rather than only once a mutation call bounces back a redirect. */
export const active = query({
	args: {},
	async handler(ctx): Promise<{ code: string; type: GameType } | null> {
		const user = await requireUser(ctx);
		const room = await getActiveRoomForUser(ctx, user._id);
		return room ? { code: room.code, type: room.type } : null;
	}
});

export const get = query({
	args: { code: v.string(), round: v.optional(v.number()) },
	async handler(ctx, { code, round }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) return null;

		const viewer = await currentPlayer(ctx, room._id);
		const engine = getEngine(room.type);
		const timeControlMs = room.time ?? DEFAULT_TIME_CONTROL_MS;

		const game = await getGame(ctx, room._id, round);
		if (!game) return null;

		const clocks = await clocksByGame(ctx, game._id);
		const clockByPlayer = new Map(clocks.map((clock) => [clock.playerId, clock]));
		const results = await resultsByGame(ctx, game._id);
		const resultByPlayer = new Map(results.map((result) => [result.playerId, result]));

		const seatIds = Array.from({ length: engine.playerCount }, (_, i) => room.players[i] ?? null);
		const playerInfos = await Promise.all(
			seatIds.map(async (id) => {
				const player = id ? await ctx.db.get(id) : null;
				return player
					? {
							name: player.name,
							emoji: player.emoji,
							score: player.score,
							seenAt: player.seenAt ?? null
						}
					: null;
			})
		);

		const myIndex = viewer ? room.players.indexOf(viewer._id) : -1;

		// Whether `game` is the live round — false when `round` pins an older one, so the client
		// can tell a manually-browsed past round apart from the one still being played.
		const currentGame = round === undefined ? game : await getCurrentGame(ctx, room._id);
		const isLive = currentGame !== null && currentGame._id === game._id;

		const remaining = seatIds.map(
			(id) => (id && clockByPlayer.get(id)?.remaining) ?? timeControlMs
		);
		const turnedAt = clocks.find((clock) => clock.turnedAt !== undefined)?.turnedAt;
		const endedSeatIndex = seatIds.findIndex(
			(id) => id !== null && resultByPlayer.get(id)?.state !== undefined
		);
		const endedSeatId = endedSeatIndex >= 0 ? seatIds[endedSeatIndex] : null;
		const reason = (endedSeatId && resultByPlayer.get(endedSeatId)?.state) ?? null;

		return {
			code: room.code,
			type: room.type,
			status: room.status ?? "active",
			players: playerInfos,
			myIndex: myIndex >= 0 ? myIndex : null,
			game: {
				state: game.state,
				// The specific round instance currently displayed.
				round: game.round,
				// The room's most recent round, so the client can offer round-by-round navigation
				// (e.g. disabling "next" past the latest one) without a separate query.
				latestRound: currentGame?.round ?? game.round,
				isLive,
				// The seat whose round has ended against them, and why — a real clock timeout, a
				// resignation, or an abandonment. Distinct causes so the client doesn't mislabel one as another.
				endedSeat: endedSeatIndex >= 0 ? (endedSeatIndex as 0 | 1) : null,
				reason
			},
			clock: {
				remaining,
				turnedAt: turnedAt ?? null
			}
		};
	}
});

export const play = mutation({
	args: { code: v.string(), move: gameMoveValidator },
	async handler(ctx, { code, move }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		if (!isRoomActive(room)) throw new Error("This room is no longer active");

		const player = await requirePlayer(ctx, room._id);
		const playerIndex = room.players.indexOf(player._id);
		if (move.kind !== room.type) throw new Error("Move does not match this room's game");

		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error("Game not found");

		const results = await resultsByGame(ctx, game._id);
		if (results.some((result) => result.state !== undefined)) {
			throw new Error("This round is already over");
		}

		const clocks = await clocksByGame(ctx, game._id);
		const beforeStatus = gameStatus(room.type, game.state);
		const actingClock =
			beforeStatus &&
			clocks.find((clock) => clock.playerId === room.players[beforeStatus.turnIndex]);

		// Reject the move outright — rather than silently applying it — if the acting player's clock
		// had already run out before this request landed. Just throws rather than also persisting the
		// timeout here: Convex rolls back every write from a handler that throws, so any patch attempted
		// on this path would never actually commit. The standalone `timeout` mutation is what persists
		// it — the same client's own clock-driven effect calls it moments later once its local display
		// also reads zero.
		let bankedRemaining: number | undefined;
		if (beforeStatus && !beforeStatus.isOver && actingClock?.turnedAt !== undefined) {
			const elapsed = Date.now() - actingClock.turnedAt;
			const remaining = actingClock.remaining - elapsed;
			if (remaining <= 0) throw new Error("Time's up");
			bankedRemaining = remaining;
		}

		const nextState = applyMove(room.type, game.state, playerIndex, move);
		if (nextState === game.state) return;

		const turn = await countMoves(ctx, game._id);
		await ctx.db.patch(game._id, { state: nextState });
		if (actingClock && bankedRemaining !== undefined) {
			await ctx.db.patch(actingClock._id, {
				remaining: bankedRemaining,
				turnedAt: undefined
			});
		}
		await ctx.db.insert("moves", {
			gameId: game._id,
			turn,
			playerId: player._id,
			state: nextState
		});

		const afterStatus = gameStatus(room.type, nextState);
		const nextClock =
			afterStatus && clocks.find((clock) => clock.playerId === room.players[afterStatus.turnIndex]);
		// Only restart a clock when the round is still live — `afterStatus.turnIndex` stays populated
		// even once `isOver` is true, so skipping this check would leave a clock ticking for a round
		// that's already finished.
		if (nextClock && afterStatus && !afterStatus.isOver) {
			await ctx.db.patch(nextClock._id, { turnedAt: Date.now() });
		}
	}
});

/** Starts the room's next round. Only valid once the current one has actually finished — enforced
 *  here (not just by disabling the button client-side) so a direct call can't dodge a loss. Either
 *  seat can trigger it unilaterally; there's no request/accept handshake. */
export const rematch = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		if (!isRoomActive(room)) throw new Error("This room is no longer active");
		await requirePlayer(ctx, room._id);

		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error("Game not found");

		const results = await resultsByGame(ctx, game._id);
		const endedResult = results.find((result) => result.state !== undefined);
		if (!endedResult && !gameStatus(room.type, game.state)?.isOver) {
			throw new Error("This round isn't over yet");
		}
		const winnerIndex = endedResult
			? otherPlayer(room.players.indexOf(endedResult.playerId))
			: roundWinner(room.type, game.state);
		if (winnerIndex !== null) {
			const winnerId = room.players[winnerIndex];
			const loserId = room.players[otherPlayer(winnerIndex)];
			const [winner, loser] = await Promise.all([ctx.db.get(winnerId), ctx.db.get(loserId)]);
			if (winner) await ctx.db.patch(winnerId, { score: winner.score + 1 });
			if (winner && loser) {
				const { winnerMmr, loserMmr } = await applyResult(ctx, winner.userId, loser.userId);
				await Promise.all([
					creditMmr(ctx, game._id, winnerId, winnerMmr),
					creditMmr(ctx, game._id, loserId, loserMmr)
				]);
			}
		}

		const timeControlMs = room.time ?? DEFAULT_TIME_CONTROL_MS;
		await createGame(ctx, room, timeControlMs, true);
	}
});

/** Shared by the `abandon` mutation and `sweep`: forfeits any round still in progress
 *  in `player`'s opponent's favor, marks `player`'s own membership over, and closes the room once no
 *  active seat remains. Assumes the caller already verified the room is active and `player` hasn't
 *  already left. */
async function forfeitRoom(ctx: MutationCtx, room: Doc<"rooms">, player: Doc<"players">) {
	// A room with an empty seat has no opponent to forfeit the round to or credit a win — e.g. the host
	// abandoning before anyone else has joined — but the round itself still needs to end, or it would
	// keep reporting "playing" in history forever even after the room closes.
	const hasOpponentSeat = room.players.length >= getEngine(room.type).playerCount;
	const game = await getCurrentGame(ctx, room._id);
	if (game) {
		let results = await resultsByGame(ctx, game._id);
		const status = gameStatus(room.type, game.state);
		const alreadyEnded = results.some((result) => result.state !== undefined);
		if (!alreadyEnded && status && !status.isOver) {
			const clocks = await clocksByGame(ctx, game._id);
			const ownClock = clocks.find((clock) => clock.playerId === player._id);
			if (ownClock) {
				await ctx.db.patch(ownClock._id, { turnedAt: undefined });
				await markEnded(ctx, game._id, player._id, "abandon");
				results = await resultsByGame(ctx, game._id);
			}
		}

		if (hasOpponentSeat) {
			// Reflects either the result just marked above, one an earlier resign/timeout already set
			// (nobody had called `rematch` yet to "cash it in"), or a round that finished naturally.
			const endedResult = results.find((result) => result.state !== undefined);
			const winnerIndex = endedResult
				? otherPlayer(room.players.indexOf(endedResult.playerId))
				: roundWinner(room.type, game.state);
			if (winnerIndex !== null && winnerIndex !== room.players.indexOf(player._id)) {
				const winnerId = room.players[winnerIndex];
				const winner = await ctx.db.get(winnerId);
				// Skip crediting a score if the opponent has themselves already left — a near-simultaneous
				// mutual abandon is treated as no-contest, matching the "everyone went idle at once" case below.
				if (winner && winner.leftAt === undefined) {
					await ctx.db.patch(winnerId, { score: winner.score + 1 });
					const { winnerMmr, loserMmr } = await applyResult(ctx, winner.userId, player.userId);
					await Promise.all([
						creditMmr(ctx, game._id, winnerId, winnerMmr),
						creditMmr(ctx, game._id, player._id, loserMmr)
					]);
				}
			}
		}
	}

	await ctx.db.patch(player._id, { leftAt: Date.now() });

	const seatedPlayers = await Promise.all(room.players.map((id) => ctx.db.get(id)));
	const remainingActive = seatedPlayers.filter((p) => p && p.leftAt === undefined).length;
	if (remainingActive < getEngine(room.type).playerCount) {
		await ctx.db.patch(room._id, { status: "closed", closedAt: Date.now(), reason: "abandoned" });
	}
}

/** Abandons the room entirely — distinct from `resign`, which only forfeits the current round. Any
 *  round still in progress is forfeited in the opponent's favor, the caller's own membership is
 *  marked over, and the room closes for good once no active seat remains. Closed rooms are never
 *  rejoinable but stay fully visible in history. Idempotent — calling it again once already
 *  left/closed is a no-op, matching `resign`'s own idempotent style. */
export const abandon = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		const player = await requirePlayer(ctx, room._id);
		if (!isRoomActive(room) || player.leftAt !== undefined) return;

		await forfeitRoom(ctx, room, player);
	}
});

/** Sweeps every active room for two kinds of dead weight: a second seat that never filled, and
 *  seats that have gone silent (no heartbeat). Runs on a schedule (see `convex/crons.ts`) — never
 *  called directly by a client. */
export const sweep = internalMutation({
	args: {},
	async handler(ctx) {
		const now = Date.now();
		const rooms = await ctx.db
			.query("rooms")
			.withIndex("byStatus", (q) => q.eq("status", "active"))
			.collect();

		for (const room of rooms) {
			const engine = getEngine(room.type);

			if (room.players.length < engine.playerCount) {
				if (now - room._creationTime > EMPTY_ROOM_TIMEOUT_MS) {
					// Nobody ever took the other seat, so the lone seat's round would otherwise stay
					// "playing" in history forever — end its clock the same way an explicit abandon would.
					const game = await getCurrentGame(ctx, room._id);
					if (game) {
						const results = await resultsByGame(ctx, game._id);
						const clocks = await clocksByGame(ctx, game._id);
						const ownClock = clocks.find(
							(clock) =>
								!results.some(
									(result) => result.playerId === clock.playerId && result.state !== undefined
								)
						);
						if (ownClock) {
							await ctx.db.patch(ownClock._id, { turnedAt: undefined });
							await markEnded(ctx, game._id, ownClock.playerId, "abandon");
						}
					}
					await ctx.db.patch(room._id, { status: "closed", closedAt: now, reason: "empty" });
				}
				continue;
			}

			// A full room's seats are guaranteed still active here — `forfeitRoom` always closes the
			// room the moment any seat's player leaves, so an "active" full room can't have a departed one.
			const players = await Promise.all(room.players.map((id) => ctx.db.get(id)));
			const stale = players.map(
				(p) => p !== null && now - (p.seenAt ?? p._creationTime) > AUTO_ABANDON_MS
			);
			const staleCount = stale.filter(Boolean).length;
			if (staleCount === 0) continue;

			if (staleCount === players.length) {
				// Every seat went silent at once — close it, but credit nobody.
				await Promise.all(
					players.map((player) => player && ctx.db.patch(player._id, { leftAt: now }))
				);
				await ctx.db.patch(room._id, { status: "closed", closedAt: now, reason: "inactive" });
				continue;
			}

			for (let i = 0; i < players.length; i++) {
				const player = players[i];
				if (player && stale[i]) await forfeitRoom(ctx, room, player);
			}
		}
	}
});

export type GameHistoryEntry = {
	round: number;
	createdAt: number;
	result: "win" | "loss" | "draw" | "playing";
	mmr: number | null;
};

export type RoomHistoryEntry = {
	code: string;
	type: GameType;
	status: "active" | "closed";
	opponentName: string | null;
	games: GameHistoryEntry[];
};

/** "win"/"loss"/"draw" once this round has ended for the player seated at `myIndex`, else "playing".
 *  Takes the round's own `results` rows rather than fetching them itself, since every caller already
 *  needs that same query for its own purposes (the settled MMR delta, in `history`'s case). Shared by
 *  `history` (per-round display) and `stats` (aggregate win rate) so the two never classify the same
 *  round differently. */
function classifyGameResult(
	room: Doc<"rooms">,
	myIndex: number,
	game: Doc<"games">,
	results: Doc<"results">[]
): GameHistoryEntry["result"] {
	const endedResult = results.find((r) => r.state !== undefined);
	const status = gameStatus(room.type, game.state);
	const isOver = endedResult !== undefined || (status?.isOver ?? false);
	if (!isOver) return "playing";

	const winnerIndex = endedResult
		? otherPlayer(room.players.indexOf(endedResult.playerId))
		: roundWinner(room.type, game.state);
	return winnerIndex === null ? "draw" : winnerIndex === myIndex ? "win" : "loss";
}

/** Every room the caller has ever played in, most recently active first, each with its own rounds
 *  most-recent-round-first — powers the signed-in-only history page. Walks rooms via the player's
 *  own rows rather than a single indexed scan since a round's outcome depends on that room's own
 *  player order and game engine. */
export const history = query({
	args: {},
	async handler(ctx): Promise<RoomHistoryEntry[]> {
		const user = await requireUser(ctx);
		const playerRows = await ctx.db
			.query("players")
			.withIndex("byUser", (q) => q.eq("userId", user._id))
			.collect();

		const rooms = await Promise.all(
			playerRows.map(async (player): Promise<RoomHistoryEntry | null> => {
				const room = await ctx.db.get(player.roomId);
				if (!room) return null;

				const myIndex = room.players.indexOf(player._id);
				const opponentId = room.players.find((id) => id !== player._id) ?? null;
				const opponent = opponentId ? await ctx.db.get(opponentId) : null;

				const games = await ctx.db
					.query("games")
					.withIndex("byRoom", (q) => q.eq("roomId", room._id))
					.collect();

				const entries = await Promise.all(
					games.map(async (game): Promise<GameHistoryEntry> => {
						const results = await resultsByGame(ctx, game._id);
						const result = classifyGameResult(room, myIndex, game, results);
						const myResult = results.find((r) => r.playerId === player._id);

						return {
							round: game.round,
							createdAt: game._creationTime,
							result,
							mmr: myResult?.mmr ?? null
						};
					})
				);
				entries.sort((a, b) => b.round - a.round);

				return {
					code: room.code,
					type: room.type,
					status: room.status ?? "active",
					opponentName: opponent?.name ?? null,
					games: entries
				};
			})
		);

		return rooms
			.filter((room): room is RoomHistoryEntry => room !== null && room.games.length > 0)
			.sort((a, b) => b.games[0]!.createdAt - a.games[0]!.createdAt);
	}
});

export type PlayerStats = {
	totalGames: number;
	wins: number;
	/** Whole-number percentage, 0 when `totalGames` is 0. */
	winRate: number;
};

/** Aggregate win/loss/draw totals across every finished round a user has ever played — the shared
 *  body behind `stats` (the caller's own line on the leaderboard hero) and `statsForUsers` (every
 *  row's line in the leaderboard list). */
async function computePlayerStats(ctx: QueryCtx, userId: Id<"users">): Promise<PlayerStats> {
	const playerRows = await ctx.db
		.query("players")
		.withIndex("byUser", (q) => q.eq("userId", userId))
		.collect();

	let totalGames = 0;
	let wins = 0;

	await Promise.all(
		playerRows.map(async (player) => {
			const room = await ctx.db.get(player.roomId);
			if (!room) return;

			const myIndex = room.players.indexOf(player._id);
			const games = await ctx.db
				.query("games")
				.withIndex("byRoom", (q) => q.eq("roomId", room._id))
				.collect();

			await Promise.all(
				games.map(async (game) => {
					const results = await resultsByGame(ctx, game._id);
					const result = classifyGameResult(room, myIndex, game, results);
					if (result === "playing") return;
					totalGames++;
					if (result === "win") wins++;
				})
			);
		})
	);

	return {
		totalGames,
		wins,
		winRate: totalGames === 0 ? 0 : Math.round((wins / totalGames) * 100)
	};
}

/** Aggregate win/loss/draw totals across every finished round the caller has ever played — powers
 *  the "Games" / "Win rate" stat line on the leaderboard's own-rating hero. */
export const stats = query({
	args: {},
	async handler(ctx): Promise<PlayerStats> {
		const user = await requireUser(ctx);
		return computePlayerStats(ctx, user._id);
	}
});

/** Same aggregate as `stats`, but for a batch of arbitrary users at once — powers the per-row
 *  "Games"/"Win rate" line for every entry the leaderboard's `ratings.top` query returns. Keyed by
 *  `userId` so the client can just index into the result rather than trusting response order. */
export const statsForUsers = query({
	args: { userIds: v.array(v.id("users")) },
	async handler(ctx, { userIds }): Promise<Record<Id<"users">, PlayerStats>> {
		const entries = await Promise.all(
			userIds.map(async (userId): Promise<[Id<"users">, PlayerStats]> => [
				userId,
				await computePlayerStats(ctx, userId)
			])
		);
		return Object.fromEntries(entries);
	}
});

export type OpenRoomEntry = {
	code: string;
	type: GameType;
	hostName: string | null;
	timeControlMs: number;
	createdAt: number;
	/** True when the viewer is already in this room (they hosted it) — they can't join their own
	 *  room, so the client shows a "View" action here instead of "Join". */
	isOwn: boolean;
};

/** Public rooms still waiting for an opponent, newest first — powers the room browser. A room drops
 *  off this list the moment its last seat fills, since it's no longer "waiting to be opened". */
export const lobbies = query({
	args: {},
	async handler(ctx): Promise<OpenRoomEntry[]> {
		const user = await requireUser(ctx);
		const ownPlayerRows = await ctx.db
			.query("players")
			.withIndex("byUser", (q) => q.eq("userId", user._id))
			.collect();
		const ownRoomIds = new Set(ownPlayerRows.map((player) => player.roomId));

		const rooms = await ctx.db
			.query("rooms")
			.withIndex("byVisibility", (q) => q.eq("visibility", "public"))
			.order("desc")
			.collect();

		const entries = await Promise.all(
			rooms.map(async (room): Promise<OpenRoomEntry | null> => {
				const engine = getEngine(room.type);
				if (!isRoomActive(room) || room.players.length >= engine.playerCount) return null;

				const hostId = room.players[0] ?? null;
				const host = hostId ? await ctx.db.get(hostId) : null;

				return {
					code: room.code,
					type: room.type,
					hostName: host?.name ?? null,
					timeControlMs: room.time ?? DEFAULT_TIME_CONTROL_MS,
					createdAt: room._creationTime,
					isOwn: ownRoomIds.has(room._id)
				};
			})
		);

		return entries.filter((room): room is OpenRoomEntry => room !== null);
	}
});
