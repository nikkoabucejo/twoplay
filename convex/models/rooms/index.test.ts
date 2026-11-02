import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api.js";
import type { Doc } from "../../_generated/dataModel.js";
import { chessEngine, type ChessState } from "../games/chess/index.js";
import { positionKey } from "../games/chess/rules.js";
import type { TictactoeState } from "../games/tictactoe/index.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { clockByGameAndPlayer, clocksByGame } from "../clocks/index.js";
import { getCurrentGame, getGame } from "../games/index.js";
import { markEnded } from "../results/index.js";
import { getRoomByCode, requireUser } from "./auth.js";

const {
	abandon,
	active,
	create,
	get,
	history,
	join,
	lobbies,
	play,
	rematch,
	stats,
	statsForUsers
} = api.models.rooms.index;
const { resign } = api.models.games.index;
const { heartbeat } = api.models.players.index;
const sweep = internal.models.rooms.index.sweep;

type Board = TictactoeState["boards"][number];
const EMPTY: Board = Array(9).fill(null);
const X_WON: Board = ["X", "X", "X", null, null, null, null, null, null];
const O_WON: Board = ["O", "O", "O", null, null, null, null, null, null];
const X_TWO: Board = ["X", "X", null, null, null, null, null, null, null];
const DRAWN: Board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
const DRAWN_BUT_LAST: Board = ["X", "O", "X", "X", "O", "O", "O", "X", null];

const SEAT_0_WINS = [X_WON, X_WON, X_WON, ...Array<Board>(6).fill(EMPTY)];
const SEAT_1_WINS = [O_WON, O_WON, O_WON, ...Array<Board>(6).fill(EMPTY)];
const DRAW = Array<Board>(9).fill(DRAWN);

const START = 1_000_000;
const MINUTE = 60_000;

const corner = { kind: "tictactoe", boardIndex: 0, cellIndex: 0 } as const;
const winningMove = { kind: "tictactoe", boardIndex: 2, cellIndex: 2 } as const;

/** Sets up a board where seat 0 wins the round with `winningMove`. */
async function setSeat0AboutToWin(t: TestConvex, code: string) {
	await setBoards(t, code, [X_WON, X_WON, X_TWO, ...Array<Board>(6).fill(EMPTY)]);
}

function useFakeTimeAtStart() {
	vi.useFakeTimers();
	vi.setSystemTime(START);
}

async function roomWithHostClock(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		const [clock] = await clocksByGame(ctx, game._id);
		return { room, game, clock };
	});
}

async function roomOf(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		return room;
	});
}

/** Each seat's round-1 clock, in seat order. */
async function clocksOf(t: TestConvex, code: string) {
	const room = await roomOf(t, code);
	return await t.run(async (ctx) => {
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		return await Promise.all(room.players.map((id) => clockByGameAndPlayer(ctx, game._id, id)));
	});
}

async function setBoards(t: TestConvex, code: string, boards: Board[]) {
	await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		await ctx.db.patch(game._id, { state: { kind: "tictactoe", boards } });
	});
}

async function gameSnapshot(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		const clocks = await Promise.all(
			room.players.map((id) => clockByGameAndPlayer(ctx, game._id, id))
		);
		const moves = await ctx.db
			.query("moves")
			.withIndex("byGame", (q) => q.eq("gameId", game._id))
			.collect();
		return { room, game, moves, clocks };
	});
}

/** Each seat's player row, rating, and round-1 result, in seat order. */
async function seats(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const firstGame = await getGame(ctx, room._id, 1);
		if (!firstGame) throw new Error(`No round 1 in room ${code}`);
		return await Promise.all(
			room.players.map(async (id) => {
				const player = await ctx.db.get(id);
				if (!player) throw new Error(`No player ${id}`);
				const rating = await ctx.db
					.query("ratings")
					.withIndex("byUser", (q) => q.eq("userId", player.userId))
					.unique();
				const result = await ctx.db
					.query("results")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", firstGame._id).eq("playerId", id))
					.unique();
				return { player, rating: rating?.rating ?? null, result };
			})
		);
	});
}

async function games(t: TestConvex, code: string): Promise<Doc<"games">[]> {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		return await ctx.db
			.query("games")
			.withIndex("byRoom", (q) => q.eq("roomId", room._id))
			.collect();
	});
}

/** The room plus each seat's player row, rating, clock, and current-round result, in seat order. */
async function snapshot(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		const seats = await Promise.all(
			room.players.map(async (id) => {
				const player = await ctx.db.get(id);
				if (!player) throw new Error(`No player ${id}`);
				const rating = await ctx.db
					.query("ratings")
					.withIndex("byUser", (q) => q.eq("userId", player.userId))
					.unique();
				const clock = await ctx.db
					.query("clocks")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", game._id).eq("playerId", id))
					.unique();
				const result = await ctx.db
					.query("results")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", game._id).eq("playerId", id))
					.unique();
				return { player, rating: rating?.rating ?? null, clock, result };
			})
		);
		return { room, seats };
	});
}

async function waitingRoom(t: TestConvex) {
	const ada = await signIn(t, "user_a", "Ada");
	const { code } = await ada.mutation(create, { type: "tictactoe" });
	return { ada, code };
}

/** Plays out finished rounds in order, each followed by a rematch that opens the next one. */
async function playRounds(t: TestConvex, code: string, rounds: Board[][]) {
	const host = t.withIdentity({ subject: "user_a", name: "Ada" });
	for (const boards of rounds) {
		await setBoards(t, code, boards);
		await host.mutation(rematch, { code });
	}
}

async function userIdOf(t: TestConvex, subject: string) {
	const user = await t.withIdentity({ subject }).run((ctx) => requireUser(ctx));
	return user._id;
}

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("create", () => {
	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.mutation(create, { type: "tictactoe" })).rejects.toThrow("Sign in to play");
	});

	test("returns a fresh six-character code without redirecting", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const result = await ada.mutation(create, { type: "tictactoe" });
		expect(result.redirected).toBe(false);
		expect(result.type).toBe("tictactoe");
		expect(result.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
	});

	test("seats the creator alone in an active room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "checkers" });
		const { room } = await roomWithHostClock(t, code);
		expect(room.status).toBe("active");
		expect(room.players).toHaveLength(1);
		const host = await t.run((ctx) => ctx.db.get(room.players[0]));
		expect(host).toMatchObject({ name: "Ada", score: 0 });
	});

	test("creates a chess room at the starting position", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const result = await ada.mutation(create, { type: "chess" });
		expect(result.type).toBe("chess");
		const { game } = await roomWithHostClock(t, result.code);
		expect(game.state).toEqual(chessEngine.createInitialState());
	});

	test("starts round 1 with the host's clock frozen", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const { game, clock } = await roomWithHostClock(t, code);
		expect(game.round).toBe(1);
		expect(clock.turnedAt).toBeUndefined();
		expect(clock.remaining).toBe(5 * 60_000);
	});

	test("defaults the time control to five minutes", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(5 * 60_000);
	});

	test("keeps an in-range time control as given", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: 90_000 });
		const { room, clock } = await roomWithHostClock(t, code);
		expect(room.time).toBe(90_000);
		expect(clock.remaining).toBe(90_000);
	});

	test("raises a time control below ten seconds to ten seconds", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: 1_000 });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(10_000);
	});

	test("raises a negative time control to ten seconds", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: -5 });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(10_000);
	});

	test("lowers a time control above sixty minutes to sixty minutes", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, {
			type: "tictactoe",
			timeControlMs: 2 * 60 * 60_000
		});
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(60 * 60_000);
	});

	test("falls back to five minutes for a NaN time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: NaN });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(5 * 60_000);
	});

	test("falls back to five minutes for an infinite time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: Infinity });
		const { room } = await roomWithHostClock(t, code);
		expect(room.time).toBe(5 * 60_000);
	});

	test("makes a room private by default", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const { room } = await roomWithHostClock(t, code);
		expect(room.visibility).toBe("private");
	});

	test("makes a room public when asked", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		const { room } = await roomWithHostClock(t, code);
		expect(room.visibility).toBe("public");
	});

	test("redirects to the caller's existing active room instead of creating another", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const first = await ada.mutation(create, { type: "tictactoe" });
		const second = await ada.mutation(create, { type: "checkers" });
		expect(second).toEqual({ code: first.code, type: "tictactoe", redirected: true });
		const roomCount = await t.run(async (ctx) => (await ctx.db.query("rooms").collect()).length);
		expect(roomCount).toBe(1);
	});

	test("creates a new room once the previous one was abandoned", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const first = await ada.mutation(create, { type: "tictactoe" });
		await ada.mutation(api.models.rooms.index.abandon, { code: first.code });
		const second = await ada.mutation(create, { type: "checkers" });
		expect(second.redirected).toBe(false);
		expect(second.code).not.toBe(first.code);
	});

	test("takes the caller out of the matchmaking queue", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await ada.mutation(api.models.pairings.index.enqueue, { type: "tictactoe" });
		await ada.mutation(create, { type: "checkers" });
		expect(await ada.query(api.models.pairings.index.status, {})).toBe(false);
		expect(await t.run((ctx) => ctx.db.query("pairings").collect())).toEqual([]);
	});

	test("gives up after ten code collisions", async () => {
		const t = setup();
		vi.spyOn(Math, "random").mockReturnValue(0);
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		await ada.mutation(create, { type: "tictactoe" });
		await expect(bea.mutation(create, { type: "tictactoe" })).rejects.toThrow(
			"Could not generate a unique room code"
		);
	});
});

describe("join", () => {
	test("rejects an unknown code", async () => {
		const t = setup();
		const bea = await signIn(t, "user_b", "Bea");
		await expect(bea.mutation(join, { code: "ZZZZZZ" })).rejects.toThrow("Room not found");
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await expect(t.mutation(join, { code })).rejects.toThrow("Sign in to play");
	});

	test("takes the open seat", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const result = await bea.mutation(join, { code });
		expect(result).toEqual({ code, type: "tictactoe", redirected: false });
		const room = await roomOf(t, code);
		const seated = await t.run((ctx) => ctx.db.get(room.players[1]));
		expect(seated?.name).toBe("Bea");
	});

	test("gives the newcomer a clock with the room's time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: 30_000 });
		await bea.mutation(join, { code });
		const [, beaClock] = await clocksOf(t, code);
		expect(beaClock?.remaining).toBe(30_000);
		expect(beaClock?.turnedAt).toBeUndefined();
	});

	test("starts the first mover's clock once the last seat fills", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const [adaClock] = await clocksOf(t, code);
		expect(adaClock?.turnedAt).toBe(1_000_000);
	});

	test("rejects a closed room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await ada.mutation(abandon, { code });
		await expect(bea.mutation(join, { code })).rejects.toThrow("This room is no longer active");
	});

	test("rejects a full room", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(join, { code })).rejects.toThrow("Room is full");
	});

	test("is a no-op for someone already seated", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		const result = await b.mutation(join, { code });
		expect(result).toEqual({ code, type: "tictactoe", redirected: false });
		expect((await roomOf(t, code)).players).toHaveLength(2);
	});

	test("is a no-op for a former seat in a closed room", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		expect(await b.mutation(join, { code })).toEqual({
			code,
			type: "tictactoe",
			redirected: false
		});
	});

	test("takes the open seat with a lowercase code and returns the stored code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const result = await bea.mutation(join, { code: code.toLowerCase() });
		expect(result).toEqual({ code, type: "tictactoe", redirected: false });
		expect((await roomOf(t, code)).players).toHaveLength(2);
	});

	test("takes a newly seated caller out of the matchmaking queue", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		await bea.mutation(api.models.pairings.index.enqueue, { type: "tictactoe" });
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await bea.mutation(join, { code });
		expect(await t.run((ctx) => ctx.db.query("pairings").collect())).toEqual([]);
	});

	test("leaves the queue entry of a caller reopening a seat they already hold", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		const beaId = await userIdOf(t, "user_b");
		await t.run((ctx) =>
			ctx.db.insert("pairings", { userId: beaId, type: "checkers", time: 300_000 })
		);
		await b.mutation(join, { code });
		expect(await t.run((ctx) => ctx.db.query("pairings").collect())).toHaveLength(1);
	});

	test("redirects to the caller's other active room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code: adaCode } = await ada.mutation(create, { type: "tictactoe" });
		const { code: beaCode } = await bea.mutation(create, { type: "checkers" });
		const result = await bea.mutation(join, { code: adaCode });
		expect(result).toEqual({ code: beaCode, type: "checkers", redirected: true });
		expect((await roomOf(t, adaCode)).players).toHaveLength(1);
	});
});

describe("active", () => {
	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.query(active, {})).rejects.toThrow("Sign in to play");
	});

	test("returns null for a caller with no room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		expect(await ada.query(active, {})).toBeNull();
	});

	test("returns the caller's active room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "checkers" });
		expect(await ada.query(active, {})).toEqual({ code, type: "checkers" });
	});

	test("returns null once the caller abandoned their room", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		expect(await a.query(active, {})).toBeNull();
	});
});

describe("get", () => {
	test("returns null for an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		expect(await ada.query(get, { code: "ZZZZZZ" })).toBeNull();
	});

	test("returns the room for a lowercase code", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		expect((await a.query(get, { code: code.toLowerCase() }))?.code).toBe(code);
	});

	test("returns the live round for a round that doesn't exist yet", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		expect((await a.query(get, { code, round: 5 }))?.game).toMatchObject({
			round: 1,
			latestRound: 1,
			isLive: true
		});
	});

	test("reports the host's seat index", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		expect((await a.query(get, { code }))?.myIndex).toBe(0);
	});

	test("reports the joiner's seat index", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		expect((await b.query(get, { code }))?.myIndex).toBe(1);
	});

	test("shows a spectator both seats with no seat index of their own", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		const view = await cy.query(get, { code });
		expect(view?.myIndex).toBeNull();
		expect(view?.players.map((player) => player?.name)).toEqual(["Ada", "Bea"]);
	});

	test("shows an empty seat as null while waiting for an opponent", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		const view = await ada.query(get, { code });
		expect(view?.players[0]).toMatchObject({ name: "Ada", score: 0, seenAt: null });
		expect(view?.players[1]).toBeNull();
	});

	test("gives an empty seat the full time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", timeControlMs: 45_000 });
		const view = await ada.query(get, { code });
		expect(view?.clock).toEqual({ remaining: [45_000, 45_000], turnedAt: null });
	});

	test("falls back to five minutes for a room without a stored time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			await ctx.db.patch(room._id, { time: undefined });
		});
		const view = await ada.query(get, { code });
		expect(view?.clock.remaining[1]).toBe(5 * 60_000);
	});

	test("reports when the running clock started", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(2_000_000);
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		expect((await a.query(get, { code }))?.clock.turnedAt).toBe(2_000_000);
	});

	test("reports the live round with no ended seat", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const view = await a.query(get, { code });
		expect(view?.status).toBe("active");
		expect(view?.game).toMatchObject({
			round: 1,
			latestRound: 1,
			isLive: true,
			endedSeat: null,
			reason: null
		});
	});

	test("reports which seat resigned", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		const view = await a.query(get, { code });
		expect(view?.game).toMatchObject({ endedSeat: 1, reason: "resign" });
	});

	test("shows a pinned past round as not live", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(rematch, { code });
		const view = await a.query(get, { code, round: 1 });
		expect(view?.game).toMatchObject({
			round: 1,
			latestRound: 2,
			isLive: false,
			reason: "resign"
		});
	});

	test("shows the newest round as live after a rematch", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(rematch, { code });
		const view = await a.query(get, { code });
		expect(view?.game).toMatchObject({ round: 2, latestRound: 2, isLive: true, reason: null });
	});

	test("reports a closed room's status", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		expect((await b.query(get, { code }))?.status).toBe("closed");
	});
});

describe("play", () => {
	beforeEach(useFakeTimeAtStart);

	test("rejects an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await expect(ada.mutation(play, { code: "ZZZZZZ", move: corner })).rejects.toThrow(
			"Room not found"
		);
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await expect(t.mutation(play, { code, move: corner })).rejects.toThrow("Sign in to play");
	});

	test("rejects a spectator", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(play, { code, move: corner })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("rejects a move in a closed room", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(abandon, { code });
		await expect(a.mutation(play, { code, move: corner })).rejects.toThrow(
			"This room is no longer active"
		);
	});

	test("rejects a move for a different game", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await expect(
			a.mutation(play, { code, move: { kind: "checkers", from: 40, to: 33 } })
		).rejects.toThrow("Move does not match this room's game");
	});

	test("rejects a move out of turn", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		await expect(b.mutation(play, { code, move: corner })).rejects.toThrow("Not your turn");
	});

	test("rejects a move once the round has been resigned", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await expect(a.mutation(play, { code, move: corner })).rejects.toThrow(
			"This round is already over"
		);
	});

	test("rejects a move while the second seat is still empty", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await expect(ada.mutation(play, { code, move: corner })).rejects.toThrow(
			"Waiting for opponent"
		);
	});

	test("applies an accepted move to the game state", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(play, { code, move: corner });
		const { game } = await gameSnapshot(t, code);
		expect(game.state.kind === "tictactoe" && game.state.boards[0]![0]).toBe("X");
	});

	test("records an accepted move as turn 0 by the mover", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(play, { code, move: corner });
		const { room, moves } = await gameSnapshot(t, code);
		expect(moves).toHaveLength(1);
		expect(moves[0]).toMatchObject({ turn: 0, playerId: room.players[0] });
	});

	test("numbers later moves sequentially", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(play, { code, move: corner });
		await b.mutation(play, { code, move: { kind: "tictactoe", boardIndex: 1, cellIndex: 4 } });
		const { moves } = await gameSnapshot(t, code);
		expect(moves.map((move) => move.turn)).toEqual([0, 1]);
	});

	test("ignores a move onto an occupied cell", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(play, { code, move: corner });
		await b.mutation(play, { code, move: corner });
		const { moves, clocks } = await gameSnapshot(t, code);
		expect(moves).toHaveLength(1);
		expect(clocks[1]?.turnedAt).toBe(START);
	});

	test("stores a legal chess move as a moves row", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "chess");
		const move = { kind: "chess", from: "e2", to: "e4" } as const;
		await a.mutation(play, { code, move });
		const { room, game, moves } = await gameSnapshot(t, code);
		const expected = chessEngine.applyMove(chessEngine.createInitialState(), 0, move);
		expect(game.state).toEqual(expected);
		expect(moves).toMatchObject([{ turn: 0, playerId: room.players[0], state: expected }]);
	});

	test("ignores an illegal chess move", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "chess");
		const before = await gameSnapshot(t, code);
		await a.mutation(play, { code, move: { kind: "chess", from: "e2", to: "e5" } });
		const after = await gameSnapshot(t, code);
		expect(after.game.state).toEqual(before.game.state);
		expect(after.moves).toEqual([]);
		expect(after.clocks).toEqual(before.clocks);
	});

	test("ignores a chess promotion with no piece", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "chess");
		const fen = "8/P6k/8/8/8/8/8/K7 w - - 0 1";
		const promoting: ChessState = { kind: "chess", fen, positions: [positionKey(fen)] };
		const { game } = await gameSnapshot(t, code);
		await t.run((ctx) => ctx.db.patch(game._id, { state: promoting }));
		await a.mutation(play, { code, move: { kind: "chess", from: "a7", to: "a8" } });
		const after = await gameSnapshot(t, code);
		expect(after.game.state).toEqual(promoting);
		expect(after.moves).toEqual([]);
	});

	test("rejects a chess move out of turn", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "chess");
		await expect(
			b.mutation(play, { code, move: { kind: "chess", from: "e7", to: "e5" } })
		).rejects.toThrow("Not your turn");
	});

	test("banks the mover's elapsed time and stops their clock", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 3_000);
		await a.mutation(play, { code, move: corner });
		const { clocks } = await gameSnapshot(t, code);
		expect(clocks[0]?.remaining).toBe(5 * 60_000 - 3_000);
		expect(clocks[0]?.turnedAt).toBeUndefined();
	});

	test("starts the opponent's clock after a move", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 3_000);
		await a.mutation(play, { code, move: corner });
		const { clocks } = await gameSnapshot(t, code);
		expect(clocks[1]).toMatchObject({ remaining: 5 * 60_000, turnedAt: START + 3_000 });
	});

	test("rejects a move after the mover's clock ran out", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe", 10_000);
		vi.setSystemTime(START + 10_000);
		await expect(a.mutation(play, { code, move: corner })).rejects.toThrow("Time's up");
	});

	test("leaves the game untouched when a move is rejected for time", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe", 10_000);
		vi.setSystemTime(START + 10_000);
		await a.mutation(play, { code, move: corner }).catch(() => undefined);
		const { moves, clocks } = await gameSnapshot(t, code);
		expect(moves).toHaveLength(0);
		expect(clocks[0]).toMatchObject({ remaining: 10_000, turnedAt: START });
	});

	test("starts no clock after the winning move", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, [X_WON, X_WON, X_TWO, ...Array(6).fill(EMPTY)]);
		await a.mutation(play, { code, move: { kind: "tictactoe", boardIndex: 2, cellIndex: 2 } });
		const { clocks } = await gameSnapshot(t, code);
		expect(clocks.map((clock) => clock?.turnedAt)).toEqual([undefined, undefined]);
	});

	test("credits the winning move's seat at once", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setSeat0AboutToWin(t, code);
		await a.mutation(play, { code, move: winningMove });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([1, 0]);
		expect([ada?.rating, bea?.rating]).toEqual([408, 392]);
	});

	test("credits nobody for a drawing move", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, [...Array<Board>(8).fill(DRAWN), DRAWN_BUT_LAST]);
		await a.mutation(play, { code, move: { kind: "tictactoe", boardIndex: 8, cellIndex: 8 } });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([0, 0]);
		expect([ada?.rating, bea?.rating]).toEqual([null, null]);
	});
});

describe("rematch", () => {
	test("rejects an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await expect(ada.mutation(rematch, { code: "ZZZZZZ" })).rejects.toThrow("Room not found");
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await expect(t.mutation(rematch, { code })).rejects.toThrow("Sign in to play");
	});

	test("rejects a spectator", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(rematch, { code })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("rejects a closed room", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		await expect(b.mutation(rematch, { code })).rejects.toThrow("This room is no longer active");
	});

	test("rejects a round still in progress", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await expect(a.mutation(rematch, { code })).rejects.toThrow("This round isn't over yet");
	});

	test("starts the next round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		expect((await games(t, code)).map((game) => game.round)).toEqual([1, 2]);
	});

	test("gives the next round fresh clocks with the first mover's running", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe", 20_000);
		await setBoards(t, code, SEAT_0_WINS);
		vi.setSystemTime(1_050_000);
		await a.mutation(rematch, { code });
		const view = await a.query(api.models.rooms.index.get, { code });
		expect(view?.clock).toEqual({ remaining: [20_000, 20_000], turnedAt: 1_050_000 });
	});

	test("adds a point to the winner of a finished round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_1_WINS);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([0, 1]);
	});

	test("moves both ratings by the flat step for a decisive round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.rating, bea?.rating]).toEqual([408, 392]);
	});

	test("records each side's MMR change on the finished round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.result?.mmr, bea?.result?.mmr]).toEqual([8, -8]);
	});

	test("records a zero MMR loss for a loser already at the rating floor", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.run(async (ctx) => {
			const bea = await requireUser(ctx);
			await ctx.db.insert("ratings", { userId: bea._id, rating: 100 });
		});
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [, bea] = await seats(t, code);
		expect(bea?.result?.mmr).toBe(0);
		expect(bea?.rating).toBe(100);
	});

	test("credits the opponent of a player who resigned", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(resign, { code });
		await b.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([0, 1]);
		expect([ada?.result, bea?.result]).toMatchObject([{ state: "resign", mmr: -8 }, { mmr: 8 }]);
	});

	test("leaves scores untouched after a drawn round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, DRAW);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([0, 0]);
	});

	test("leaves ratings and MMR unset after a drawn round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, DRAW);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.rating, bea?.rating]).toEqual([null, null]);
		expect([ada?.result, bea?.result]).toEqual([null, null]);
	});

	test("is a no-op when called again for a round already rematched", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(rematch, { code, round: 1 });
		await b.mutation(rematch, { code, round: 1 });
		expect((await games(t, code)).map((game) => game.round)).toEqual([1, 2]);
	});

	test("without a round, still rejects a round in progress after a rematch", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(rematch, { code });
		await expect(b.mutation(rematch, { code })).rejects.toThrow("This round isn't over yet");
	});

	test("credits nothing more for a win already settled", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await setSeat0AboutToWin(t, code);
		await a.mutation(play, { code, move: winningMove });
		await b.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([1, 0]);
		expect([ada?.rating, bea?.rating]).toEqual([408, 392]);
		expect((await games(t, code)).map((game) => game.round)).toEqual([1, 2]);
	});

	test("settles a won round that has no settlement once", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [ada, bea] = await seats(t, code);
		expect([ada?.player.score, bea?.player.score]).toEqual([1, 0]);
		expect([ada?.rating, bea?.rating]).toEqual([408, 392]);
		expect((await games(t, code))[0]?.settledAt).toBeDefined();
	});

	test("accumulates the score across rounds", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		await setBoards(t, code, SEAT_0_WINS);
		await a.mutation(rematch, { code });
		const [ada] = await seats(t, code);
		expect(ada?.player.score).toBe(2);
		expect(ada?.rating).toBe(416);
	});
});

describe("abandon", () => {
	beforeEach(useFakeTimeAtStart);

	test("rejects an unknown code", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await expect(ada.mutation(abandon, { code: "ZZZZZZ" })).rejects.toThrow("Room not found");
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await expect(t.mutation(abandon, { code })).rejects.toThrow("Sign in to play");
	});

	test("rejects a spectator", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		await expect(cy.mutation(abandon, { code })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("closes the room as abandoned", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 5_000);
		await a.mutation(abandon, { code });
		const { room } = await snapshot(t, code);
		expect(room).toMatchObject({ status: "closed", closedAt: START + 5_000, reason: "abandoned" });
	});

	test("marks the abandoner's membership over", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		vi.setSystemTime(START + 5_000);
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats[0]?.player.leftAt).toBe(START + 5_000);
		expect(seats[1]?.player.leftAt).toBeUndefined();
	});

	test("ends the abandoner's round in progress as abandoned", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats[0]?.result?.state).toBe("abandon");
		expect(seats[0]?.clock?.turnedAt).toBeUndefined();
	});

	test("awards the opponent a point for a round in progress", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 1]);
	});

	test("settles ratings in the opponent's favor for a round in progress", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.rating)).toEqual([392, 408]);
		expect(seats.map((seat) => seat.result?.mmr)).toEqual([-8, 8]);
	});

	test("ends a lone host's round without rating anyone", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe" });
		await ada.mutation(abandon, { code });
		const { room, seats } = await snapshot(t, code);
		expect(room.status).toBe("closed");
		expect(seats[0]?.result).toMatchObject({ state: "abandon" });
		expect(seats[0]?.result?.mmr).toBeUndefined();
		expect(seats[0]?.rating).toBeNull();
	});

	test("is a no-op when called again by the same player", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		vi.setSystemTime(START + 60_000);
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats[0]?.player.leftAt).toBe(START);
		expect(seats[1]?.player.score).toBe(1);
	});

	test("is a no-op for the remaining player once the room has closed", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		await b.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats[1]?.player.leftAt).toBeUndefined();
		expect(seats.map((seat) => seat.rating)).toEqual([392, 408]);
	});

	test("cashes in a finished round the opponent won", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, [O_WON, O_WON, O_WON, ...Array<Board>(6).fill(EMPTY)]);
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 1]);
		expect(seats[0]?.result?.state).toBeUndefined();
	});

	test("credits a finished round the abandoner won", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setBoards(t, code, [X_WON, X_WON, X_WON, ...Array<Board>(6).fill(EMPTY)]);
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([1, 0]);
		expect(seats.map((seat) => seat.rating)).toEqual([408, 392]);
	});

	test("credits the opponent once for a round the abandoner had already resigned", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(resign, { code });
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([0, 1]);
		expect(seats[0]?.result).toMatchObject({ state: "resign", mmr: -8 });
	});

	test("keeps the abandoner's win when the opponent had already resigned the round", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		await a.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([1, 0]);
		expect(seats.map((seat) => seat.result?.state)).toEqual([undefined, "resign"]);
	});

	test("doesn't credit a settled win twice when the loser abandons", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await setSeat0AboutToWin(t, code);
		await a.mutation(play, { code, move: winningMove });
		await b.mutation(abandon, { code });
		const { seats } = await snapshot(t, code);
		expect(seats.map((seat) => seat.player.score)).toEqual([1, 0]);
		expect(seats.map((seat) => seat.rating)).toEqual([408, 392]);
	});

	test("makes a lone host's round no-contest and leaves their rating at the default", async () => {
		const t = setup();
		const { ada, code } = await waitingRoom(t);
		await ada.mutation(abandon, { code });
		expect(await ada.query(api.models.ratings.index.mine, {})).toBe(400);
		expect((await games(t, code))[0]?.isNoContest).toBe(true);
	});
});

describe("sweep", () => {
	beforeEach(useFakeTimeAtStart);

	describe("rooms waiting for an opponent", () => {
		test("leaves a room that has waited exactly 45 minutes", async () => {
			const t = setup();
			const { code } = await waitingRoom(t);
			vi.setSystemTime(START + 45 * MINUTE);
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room.status).toBe("active");
		});

		test("closes a room that has waited over 45 minutes as empty", async () => {
			const t = setup();
			const { code } = await waitingRoom(t);
			vi.setSystemTime(START + 45 * MINUTE + 1);
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room).toMatchObject({
				status: "closed",
				closedAt: START + 45 * MINUTE + 1,
				reason: "empty"
			});
		});

		test("ends the lone host's round as abandoned", async () => {
			const t = setup();
			const { code } = await waitingRoom(t);
			vi.setSystemTime(START + 46 * MINUTE);
			await t.mutation(sweep, {});
			const { seats } = await snapshot(t, code);
			expect(seats[0]?.result?.state).toBe("abandon");
			expect(seats[0]?.clock?.turnedAt).toBeUndefined();
		});

		test("makes the lone host's round no-contest", async () => {
			const t = setup();
			const { code } = await waitingRoom(t);
			vi.setSystemTime(START + 46 * MINUTE);
			await t.mutation(sweep, {});
			expect((await games(t, code))[0]?.isNoContest).toBe(true);
			expect((await snapshot(t, code)).seats[0]?.rating).toBeNull();
		});

		test("keeps a lone host's earlier resignation as the round's cause", async () => {
			const t = setup();
			const { code } = await waitingRoom(t);
			const { room, game } = await roomWithHostClock(t, code);
			await t.run((ctx) => markEnded(ctx, game._id, room.players[0], "resign"));
			vi.setSystemTime(START + 46 * MINUTE);
			await t.mutation(sweep, {});
			const { seats } = await snapshot(t, code);
			expect(seats[0]?.result?.state).toBe("resign");
		});

		test("ignores heartbeats when deciding a waiting room is empty", async () => {
			const t = setup();
			const { ada, code } = await waitingRoom(t);
			vi.setSystemTime(START + 46 * MINUTE);
			await ada.mutation(heartbeat, { code });
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room.reason).toBe("empty");
		});

		// Bug: sweep only scans `status: "active"`, but `isRoomActive` also treats a missing status as active.
		test.fails("closes an old waiting room that predates the status field", async () => {
			const t = setup();
			const { code } = await waitingRoom(t);
			await t.run(async (ctx) => {
				const room = await getRoomByCode(ctx, code);
				if (!room) throw new Error(`No room ${code}`);
				await ctx.db.patch(room._id, { status: undefined });
			});
			vi.setSystemTime(START + 46 * MINUTE);
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room.status).toBe("closed");
		});
	});

	describe("full rooms", () => {
		test("leaves a room whose seats were both seen within 4 minutes", async () => {
			const t = setup();
			const { code } = await seatedRoom(t, "tictactoe");
			vi.setSystemTime(START + 4 * MINUTE);
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room.status).toBe("active");
		});

		test("keeps a room alive past 4 minutes while both seats heartbeat", async () => {
			const t = setup();
			const { a, b, code } = await seatedRoom(t, "tictactoe");
			vi.setSystemTime(START + 3 * MINUTE);
			await a.mutation(heartbeat, { code });
			await b.mutation(heartbeat, { code });
			vi.setSystemTime(START + 6 * MINUTE);
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room.status).toBe("active");
		});

		test("closes the room as abandoned when one seat has been silent over 4 minutes", async () => {
			const t = setup();
			const { a, code } = await seatedRoom(t, "tictactoe");
			vi.setSystemTime(START + 3 * MINUTE);
			await a.mutation(heartbeat, { code });
			vi.setSystemTime(START + 4 * MINUTE + 1);
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room).toMatchObject({
				status: "closed",
				reason: "abandoned"
			});
		});

		test("forfeits the silent seat to the present one", async () => {
			const t = setup();
			const { a, code } = await seatedRoom(t, "tictactoe");
			vi.setSystemTime(START + 3 * MINUTE);
			await a.mutation(heartbeat, { code });
			vi.setSystemTime(START + 4 * MINUTE + 1);
			await t.mutation(sweep, {});
			const { seats } = await snapshot(t, code);
			expect(seats.map((seat) => seat.player.score)).toEqual([1, 0]);
			expect(seats.map((seat) => seat.rating)).toEqual([408, 392]);
			expect(seats[1]?.result?.state).toBe("abandon");
		});

		test("marks only the silent seat as having left", async () => {
			const t = setup();
			const { a, code } = await seatedRoom(t, "tictactoe");
			vi.setSystemTime(START + 3 * MINUTE);
			await a.mutation(heartbeat, { code });
			vi.setSystemTime(START + 4 * MINUTE + 1);
			await t.mutation(sweep, {});
			const { seats } = await snapshot(t, code);
			expect(seats.map((seat) => seat.player.leftAt)).toEqual([undefined, START + 4 * MINUTE + 1]);
		});

		test("closes the room as inactive when every seat went silent", async () => {
			const t = setup();
			const { code } = await seatedRoom(t, "tictactoe");
			vi.setSystemTime(START + 5 * MINUTE);
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room).toMatchObject({
				status: "closed",
				closedAt: START + 5 * MINUTE,
				reason: "inactive"
			});
		});

		test("marks every silent seat as having left", async () => {
			const t = setup();
			const { code } = await seatedRoom(t, "tictactoe");
			vi.setSystemTime(START + 5 * MINUTE);
			await t.mutation(sweep, {});
			const { seats } = await snapshot(t, code);
			expect(seats.map((seat) => seat.player.leftAt)).toEqual([
				START + 5 * MINUTE,
				START + 5 * MINUTE
			]);
		});

		test("credits nobody when every seat went silent", async () => {
			const t = setup();
			const { code } = await seatedRoom(t, "tictactoe", 10 * MINUTE);
			vi.setSystemTime(START + 5 * MINUTE);
			await t.mutation(sweep, {});
			const { seats } = await snapshot(t, code);
			expect(seats.map((seat) => seat.player.score)).toEqual([0, 0]);
			expect(seats.map((seat) => seat.rating)).toEqual([null, null]);
		});

		test("a seat whose clock ran out loses on timeout when the opponent goes silent", async () => {
			const t = setup();
			const { a, code } = await seatedRoom(t, "tictactoe", 10_000);
			vi.setSystemTime(START + 3 * MINUTE);
			await a.mutation(heartbeat, { code });
			vi.setSystemTime(START + 4 * MINUTE + 1);
			await t.mutation(sweep, {});
			const { seats } = await snapshot(t, code);
			expect(seats.map((seat) => seat.result?.state)).toEqual(["timeout", undefined]);
			expect(seats.map((seat) => seat.player.score)).toEqual([0, 1]);
			expect(seats.map((seat) => seat.rating)).toEqual([392, 408]);
		});

		test("a seat whose clock ran out loses on timeout when every seat goes silent", async () => {
			const t = setup();
			const { code } = await seatedRoom(t, "tictactoe", 10_000);
			vi.setSystemTime(START + 5 * MINUTE);
			await t.mutation(sweep, {});
			const { game } = await gameSnapshot(t, code);
			const { seats } = await snapshot(t, code);
			expect(game.isNoContest).toBeUndefined();
			expect(seats.map((seat) => seat.result?.state)).toEqual(["timeout", undefined]);
			expect(seats.map((seat) => seat.rating)).toEqual([392, 408]);
		});

		test("makes the round no-contest and stops every clock when every seat went silent", async () => {
			const t = setup();
			const { code } = await seatedRoom(t, "tictactoe", 10 * MINUTE);
			vi.setSystemTime(START + 5 * MINUTE);
			await t.mutation(sweep, {});
			const { game, clocks } = await gameSnapshot(t, code);
			expect(game.isNoContest).toBe(true);
			expect(clocks.map((clock) => clock?.turnedAt)).toEqual([undefined, undefined]);
		});
	});

	describe("closed rooms", () => {
		test("leaves an already closed room untouched", async () => {
			const t = setup();
			const { code } = await seatedRoom(t, "tictactoe");
			vi.setSystemTime(START + 5 * MINUTE);
			await t.mutation(sweep, {});
			vi.setSystemTime(START + 60 * MINUTE);
			await t.mutation(sweep, {});
			expect((await snapshot(t, code)).room).toMatchObject({
				closedAt: START + 5 * MINUTE,
				reason: "inactive"
			});
		});
	});
});

describe("history", () => {
	beforeEach(useFakeTimeAtStart);

	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.query(history, {})).rejects.toThrow("Sign in to play");
	});

	test("is empty for a user who never played", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		expect(await ada.query(history, {})).toEqual([]);
	});

	test("lists a waiting room with no opponent and its round in progress", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "checkers" });
		expect(await ada.query(history, {})).toEqual([
			{
				code,
				type: "checkers",
				status: "active",
				opponentName: null,
				games: [
					{
						round: 1,
						createdAt: expect.closeTo(START, 0),
						result: "playing",
						mmr: null,
						reason: null
					}
				]
			}
		]);
	});

	test("names the opponent", async () => {
		const t = setup();
		const { b } = await seatedRoom(t, "tictactoe");
		const [room] = await b.query(history, {});
		expect(room?.opponentName).toBe("Ada");
	});

	test("lists rounds newest first, classified from the caller's seat", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await playRounds(t, code, [SEAT_0_WINS, DRAW]);
		const [adaRoom] = await a.query(history, {});
		const [beaRoom] = await b.query(history, {});
		expect(adaRoom?.games.map((game) => [game.round, game.result])).toEqual([
			[3, "playing"],
			[2, "draw"],
			[1, "win"]
		]);
		expect(beaRoom?.games.map((game) => game.result)).toEqual(["playing", "draw", "loss"]);
	});

	test("shows each round's settled MMR change", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await playRounds(t, code, [SEAT_1_WINS, DRAW]);
		const [adaRoom] = await a.query(history, {});
		const [beaRoom] = await b.query(history, {});
		expect(adaRoom?.games.map((game) => game.mmr)).toEqual([null, null, -8]);
		expect(beaRoom?.games.map((game) => game.mmr)).toEqual([null, null, 8]);
	});

	test("counts a resigned round as a loss for the resigner", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(resign, { code });
		const [adaRoom] = await a.query(history, {});
		const [beaRoom] = await b.query(history, {});
		expect(adaRoom?.games[0]?.result).toBe("loss");
		expect(beaRoom?.games[0]?.result).toBe("win");
	});

	test("shows a closed room as closed", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code });
		const [room] = await a.query(history, {});
		expect(room?.status).toBe("closed");
	});

	test("orders rooms by their most recent round, newest first", async () => {
		const t = setup();
		const { a, code: oldCode } = await seatedRoom(t, "tictactoe");
		await a.mutation(abandon, { code: oldCode });
		vi.setSystemTime(START + 60_000);
		const { code: newCode } = await a.mutation(create, { type: "checkers" });
		expect((await a.query(history, {})).map((room) => room.code)).toEqual([newCode, oldCode]);
	});

	test("leaves out an abandoned room nobody joined", async () => {
		const t = setup();
		const { ada, code } = await waitingRoom(t);
		await ada.mutation(abandon, { code });
		expect(await ada.query(history, {})).toEqual([]);
	});

	test("leaves out a round closed by the idle sweep instead of showing it as playing", async () => {
		const t = setup();
		const { a } = await seatedRoom(t, "tictactoe", 10 * MINUTE);
		vi.setSystemTime(START + 5 * MINUTE);
		await t.mutation(sweep, {});
		expect(await a.query(history, {})).toEqual([]);
	});

	test("leaves out an unfinished round in a room closed before rounds were voided", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const room = await roomOf(t, code);
		await t.run((ctx) => ctx.db.patch(room._id, { status: "closed", closedAt: START }));
		expect(await a.query(history, {})).toEqual([]);
	});

	test("doesn't count an old abandoned round in a room nobody joined as a loss", async () => {
		const t = setup();
		const { ada, code } = await waitingRoom(t);
		const { room, game } = await roomWithHostClock(t, code);
		await t.run(async (ctx) => {
			await markEnded(ctx, game._id, room.players[0], "abandon");
			await ctx.db.patch(room._id, { status: "closed", closedAt: START });
		});
		expect(await ada.query(history, {})).toEqual([]);
	});

	test("gives a resigned round the reason resign", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await b.mutation(resign, { code });
		const [room] = await a.query(history, {});
		expect(room?.games[0]).toMatchObject({ result: "win", reason: "resign" });
	});

	test("gives a timed-out round the reason timeout", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe", 10_000);
		vi.setSystemTime(START + 10_000);
		await b.mutation(api.models.games.index.timeout, { code });
		const [room] = await b.query(history, {});
		expect(room?.games[0]).toMatchObject({ result: "win", reason: "timeout" });
	});

	test("gives a round won on the board no reason", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await setSeat0AboutToWin(t, code);
		await a.mutation(play, { code, move: winningMove });
		const [room] = await a.query(history, {});
		expect(room?.games[0]).toMatchObject({ result: "win", reason: null });
	});

	test("omits a room with no rounds", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const userId = await userIdOf(t, "user_a");
		await t.run(async (ctx) => {
			const roomId = await ctx.db.insert("rooms", {
				code: "EMPTY1",
				type: "tictactoe",
				players: []
			});
			const playerId = await ctx.db.insert("players", {
				userId,
				roomId,
				name: "Ada",
				score: 0,
				emoji: "1f600"
			});
			await ctx.db.patch(roomId, { players: [playerId] });
		});
		expect(await ada.query(history, {})).toEqual([]);
	});
});

describe("stats", () => {
	beforeEach(useFakeTimeAtStart);

	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.query(stats, {})).rejects.toThrow("Sign in to play");
	});

	test("is all zeros for a user who never played", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		expect(await ada.query(stats, {})).toEqual({ totalGames: 0, wins: 0, winRate: 0 });
	});

	test("counts finished rounds and leaves out the one in progress", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await playRounds(t, code, [SEAT_0_WINS, DRAW]);
		expect(await a.query(stats, {})).toEqual({ totalGames: 2, wins: 1, winRate: 50 });
	});

	test("rounds the win rate to a whole percentage", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		await playRounds(t, code, [SEAT_0_WINS, SEAT_1_WINS, SEAT_1_WINS]);
		expect(await a.query(stats, {})).toEqual({ totalGames: 3, wins: 1, winRate: 33 });
		expect(await b.query(stats, {})).toEqual({ totalGames: 3, wins: 2, winRate: 67 });
	});

	test("doesn't count an abandoned room nobody joined", async () => {
		const t = setup();
		const { ada, code } = await waitingRoom(t);
		await ada.mutation(abandon, { code });
		expect(await ada.query(stats, {})).toEqual({ totalGames: 0, wins: 0, winRate: 0 });
	});

	test("adds up rounds across rooms", async () => {
		const t = setup();
		const { a, code: firstCode } = await seatedRoom(t, "tictactoe");
		await a.mutation(resign, { code: firstCode });
		await a.mutation(abandon, { code: firstCode });
		const bea = t.withIdentity({ subject: "user_b", name: "Bea" });
		const { code: secondCode } = await bea.mutation(create, { type: "tictactoe" });
		await a.mutation(api.models.rooms.index.join, { code: secondCode });
		await setBoards(t, secondCode, SEAT_1_WINS);
		expect(await a.query(stats, {})).toEqual({ totalGames: 2, wins: 1, winRate: 50 });
	});
});

describe("statsForUsers", () => {
	beforeEach(useFakeTimeAtStart);

	test("returns each requested user's stats keyed by user id", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await playRounds(t, code, [SEAT_0_WINS]);
		const [adaId, beaId] = [await userIdOf(t, "user_a"), await userIdOf(t, "user_b")];
		expect(await a.query(statsForUsers, { userIds: [adaId, beaId] })).toEqual({
			[adaId]: { totalGames: 1, wins: 1, winRate: 100 },
			[beaId]: { totalGames: 1, wins: 0, winRate: 0 }
		});
	});

	test("doesn't count an abandoned room nobody joined", async () => {
		const t = setup();
		const { ada, code } = await waitingRoom(t);
		await ada.mutation(abandon, { code });
		const adaId = await userIdOf(t, "user_a");
		expect(await ada.query(statsForUsers, { userIds: [adaId] })).toEqual({
			[adaId]: { totalGames: 0, wins: 0, winRate: 0 }
		});
	});

	test("gives a user who never played all zeros", async () => {
		const t = setup();
		const cy = await signIn(t, "user_c", "Cy");
		const cyId = await userIdOf(t, "user_c");
		expect(await cy.query(statsForUsers, { userIds: [cyId] })).toEqual({
			[cyId]: { totalGames: 0, wins: 0, winRate: 0 }
		});
	});

	test("returns an empty map for no users", async () => {
		const t = setup();
		const cy = await signIn(t, "user_c", "Cy");
		expect(await cy.query(statsForUsers, { userIds: [] })).toEqual({});
	});
});

describe("lobbies", () => {
	beforeEach(useFakeTimeAtStart);

	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.query(lobbies, {})).rejects.toThrow("Sign in to play");
	});

	test("lists a public room waiting for an opponent", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, {
			type: "checkers",
			visibility: "public",
			timeControlMs: 120_000
		});
		expect(await bea.query(lobbies, {})).toEqual([
			{
				code,
				type: "checkers",
				hostName: "Ada",
				timeControlMs: 120_000,
				createdAt: expect.closeTo(START, 0),
				isOwn: false
			}
		]);
	});

	test("flags the host's own room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		const [room] = await ada.query(lobbies, {});
		expect(room?.isOwn).toBe(true);
	});

	test("leaves out a private room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		await ada.mutation(create, { type: "tictactoe" });
		expect(await bea.query(lobbies, {})).toEqual([]);
	});

	test("leaves out a room that predates the visibility field", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			await ctx.db.patch(room._id, { visibility: undefined });
		});
		expect(await bea.query(lobbies, {})).toEqual([]);
	});

	test("leaves out a public room once its last seat fills", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const cy = await signIn(t, "user_c", "Cy");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		await bea.mutation(join, { code });
		expect(await cy.query(lobbies, {})).toEqual([]);
	});

	test("leaves out a closed public room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		await ada.mutation(abandon, { code });
		expect(await bea.query(lobbies, {})).toEqual([]);
	});

	test("lists the newest room first", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const bea = await signIn(t, "user_b", "Bea");
		const cy = await signIn(t, "user_c", "Cy");
		const { code: older } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		vi.setSystemTime(START + 60_000);
		const { code: newer } = await bea.mutation(create, { type: "tictactoe", visibility: "public" });
		expect((await cy.query(lobbies, {})).map((room) => room.code)).toEqual([newer, older]);
	});

	test("reports five minutes for a room without a stored time control", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(create, { type: "tictactoe", visibility: "public" });
		await t.run(async (ctx) => {
			const room = await getRoomByCode(ctx, code);
			if (!room) throw new Error(`No room ${code}`);
			await ctx.db.patch(room._id, { time: undefined });
		});
		const [room] = await ada.query(lobbies, {});
		expect(room?.timeControlMs).toBe(5 * 60_000);
	});
});
