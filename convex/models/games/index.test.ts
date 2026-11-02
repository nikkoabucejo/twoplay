import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getRoomByCode } from "../rooms/auth.js";
import { checkersEngine } from "./checkers/index.js";
import { chessEngine, type ChessState } from "./chess/index.js";
import { positionKey } from "./chess/rules.js";
import {
	applyMove,
	countMoves,
	createGame,
	gameEngines,
	gameStatus,
	getCurrentGame,
	getEngine,
	claimExpiredClock,
	getGame,
	roundWinner,
	settleRound,
	type GameState
} from "./index.js";
import { tictactoeEngine } from "./tictactoe/index.js";

const tictactoeMove = { kind: "tictactoe", boardIndex: 0, cellIndex: 0 } as const;
const checkersMove = { kind: "checkers", from: 42, to: 35 } as const;
const chessMove = { kind: "chess", from: "e2", to: "e4" } as const;

function chessAt(fen: string): ChessState {
	return { kind: "chess", fen, positions: [positionKey(fen)] };
}

/** 1. f3 e5 2. g4 Qh4#: black mates, so seat 1 wins. */
const FOOLS_MATE = chessAt("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3");
const STALEMATE = chessAt("7k/5Q2/6K1/8/8/8/8/8 b - - 1 1");
/** White to move with a rook against black's lone king. */
const LONE_BLACK_KING = chessAt("4k3/8/8/8/8/8/8/R3K3 w - - 0 1");

/** A tictactoe state where X has won the top meta row. */
function decidedTictactoe(): GameState {
	const won = ["X", "X", "X", "O", "O", null, null, null, null] as const;
	const empty = Array(9).fill(null);
	return {
		kind: "tictactoe",
		boards: [[...won], [...won], [...won], ...Array.from({ length: 6 }, () => [...empty])]
	};
}

/** A tictactoe state where every small board is full with no line, so the round is a draw. */
function drawnTictactoe(): GameState {
	const drawn = ["X", "O", "X", "X", "O", "O", "O", "X", "X"] as const;
	return { kind: "tictactoe", boards: Array.from({ length: 9 }, () => [...drawn]) };
}

async function roomAndGame(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`no room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`no game in ${code}`);
		return { room, game };
	});
}

/** The rows that ended the round (a resign, timeout, or abandon), leaving out MMR-only rows. */
async function endedResultsOf(t: TestConvex, gameId: Id<"games">) {
	const results = await t.run((ctx) =>
		ctx.db
			.query("results")
			.withIndex("byGame", (q) => q.eq("gameId", gameId))
			.collect()
	);
	return results.filter((result) => result.state !== undefined);
}

async function clocksOf(t: TestConvex, gameId: Id<"games">) {
	return await t.run((ctx) =>
		ctx.db
			.query("clocks")
			.withIndex("byGame", (q) => q.eq("gameId", gameId))
			.collect()
	);
}

/** Each seat's room score, rating (null before any rated round), and MMR change for `gameId`. */
async function standings(t: TestConvex, players: Id<"players">[], gameId: Id<"games">) {
	return await t.run((ctx) =>
		Promise.all(
			players.map(async (id) => {
				const player = await ctx.db.get(id);
				if (!player) throw new Error(`no player ${id}`);
				const rating = await ctx.db
					.query("ratings")
					.withIndex("byUser", (q) => q.eq("userId", player.userId))
					.unique();
				const result = await ctx.db
					.query("results")
					.withIndex("byGameAndPlayer", (q) => q.eq("gameId", gameId).eq("playerId", id))
					.unique();
				return { score: player.score, rating: rating?.rating ?? null, mmr: result?.mmr ?? null };
			})
		)
	);
}

async function closeRoom(t: TestConvex, roomId: Id<"rooms">) {
	await t.run((ctx) => ctx.db.patch(roomId, { status: "closed", closedAt: Date.now() }));
}

async function setGameState(t: TestConvex, gameId: Id<"games">, state: GameState) {
	await t.run((ctx) => ctx.db.patch(gameId, { state }));
}

describe("registry", () => {
	test.each(Object.entries(gameEngines))(
		"the %s entry is the engine of that kind",
		(key, engine) => {
			expect(engine.kind).toBe(key);
		}
	);

	test("getEngine returns the registered engine for each game type", () => {
		expect(getEngine("tictactoe")).toBe(tictactoeEngine);
		expect(getEngine("checkers")).toBe(checkersEngine);
		expect(getEngine("chess")).toBe(chessEngine);
	});
});

describe("applyMove dispatch", () => {
	test("routes a tictactoe move to the tictactoe engine", () => {
		const next = applyMove("tictactoe", tictactoeEngine.createInitialState(), 0, tictactoeMove);
		expect(next).toEqual(
			tictactoeEngine.applyMove(tictactoeEngine.createInitialState(), 0, tictactoeMove)
		);
	});

	test("routes a checkers move to the checkers engine", () => {
		const next = applyMove("checkers", checkersEngine.createInitialState(), 0, checkersMove);
		expect(next).toEqual(
			checkersEngine.applyMove(checkersEngine.createInitialState(), 0, checkersMove)
		);
	});

	test("routes a chess move to the chess engine", () => {
		const next = applyMove("chess", chessEngine.createInitialState(), 0, chessMove);
		expect(next).toEqual(chessEngine.applyMove(chessEngine.createInitialState(), 0, chessMove));
	});

	test("propagates the engine's Not your turn error", () => {
		expect(() =>
			applyMove("tictactoe", tictactoeEngine.createInitialState(), 1, tictactoeMove)
		).toThrow("Not your turn");
	});

	test.each([
		["tictactoe", "a checkers state", checkersEngine.createInitialState(), tictactoeMove],
		["tictactoe", "a checkers move", tictactoeEngine.createInitialState(), checkersMove],
		["checkers", "a tictactoe state", tictactoeEngine.createInitialState(), checkersMove],
		["checkers", "a tictactoe move", checkersEngine.createInitialState(), tictactoeMove],
		["chess", "a checkers state", checkersEngine.createInitialState(), chessMove],
		["chess", "a checkers move", chessEngine.createInitialState(), checkersMove],
		["checkers", "a chess move", checkersEngine.createInitialState(), chessMove]
	] as const)("a %s room throws when given %s", (gameType, _, state, move) => {
		expect(() => applyMove(gameType, state, 0, move)).toThrow(
			"Move does not match this room's game"
		);
	});
});

describe("status and roundWinner dispatch", () => {
	test("gameStatus routes to the matching engine", () => {
		expect(gameStatus("tictactoe", decidedTictactoe())).toEqual({
			turnIndex: 1,
			winnerIndex: 0,
			isOver: true
		});
		expect(gameStatus("checkers", checkersEngine.createInitialState())).toEqual({
			turnIndex: 0,
			winnerIndex: null,
			isOver: false
		});
	});

	test("roundWinner routes to the matching engine", () => {
		expect(roundWinner("tictactoe", decidedTictactoe())).toBe(0);
		expect(roundWinner("checkers", checkersEngine.createInitialState())).toBeNull();
	});

	test("a chess checkmate is over with the mating seat as the winner", () => {
		expect(gameStatus("chess", FOOLS_MATE)).toEqual({ turnIndex: 0, winnerIndex: 1, isOver: true });
		expect(roundWinner("chess", FOOLS_MATE)).toBe(1);
	});

	test("a chess stalemate is over with no winner", () => {
		expect(gameStatus("chess", STALEMATE)).toMatchObject({ winnerIndex: null, isOver: true });
		expect(roundWinner("chess", STALEMATE)).toBeNull();
	});

	test.each([
		["tictactoe", checkersEngine.createInitialState()],
		["checkers", tictactoeEngine.createInitialState()],
		["chess", checkersEngine.createInitialState()]
	] as const)("gameStatus throws for a %s room holding another game's state", (type, state) => {
		expect(() => gameStatus(type, state)).toThrow("State does not match this room's game");
	});

	test.each([
		["tictactoe", checkersEngine.createInitialState()],
		["checkers", tictactoeEngine.createInitialState()],
		["chess", checkersEngine.createInitialState()]
	] as const)("roundWinner throws for a %s room holding another game's state", (type, state) => {
		expect(() => roundWinner(type, state)).toThrow("State does not match this room's game");
	});
});

describe("game rows", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	test("a new room starts round 1 with the engine's initial state", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "checkers");
		const { game } = await roomAndGame(t, code);
		expect(game.round).toBe(1);
		expect(game.state).toEqual(checkersEngine.createInitialState());
	});

	test("createGame starts the next round, which becomes the current game", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { room } = await roomAndGame(t, code);
		await t.run((ctx) => createGame(ctx, room, 60_000, true));
		const { game } = await roomAndGame(t, code);
		expect(game.round).toBe(2);
	});

	test("getGame returns a past round by number", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { room, game: first } = await roomAndGame(t, code);
		await t.run((ctx) => createGame(ctx, room, 60_000, true));
		const past = await t.run((ctx) => getGame(ctx, room._id, 1));
		expect(past?._id).toBe(first._id);
	});

	test("getGame falls back to the live round for a round that never happened", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { room, game } = await roomAndGame(t, code);
		expect((await t.run((ctx) => getGame(ctx, room._id, 7)))?._id).toBe(game._id);
	});

	test("createGame gives every seat a clock with the time control", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { room } = await roomAndGame(t, code);
		const gameId = await t.run((ctx) => createGame(ctx, room, 42_000, false));
		const clocks = await clocksOf(t, gameId);
		expect(clocks.map((clock) => clock.playerId).sort()).toEqual([...room.players].sort());
		expect(clocks.every((clock) => clock.remaining === 42_000)).toBe(true);
	});

	test("createGame starts only the clock of the seat to move when asked", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { room } = await roomAndGame(t, code);
		const gameId = await t.run((ctx) => createGame(ctx, room, 60_000, true));
		const clocks = await clocksOf(t, gameId);
		const turnedAt = new Map(clocks.map((clock) => [clock.playerId, clock.turnedAt]));
		expect(turnedAt.get(room.players[0])).toBe(1_000_000);
		expect(turnedAt.get(room.players[1])).toBeUndefined();
	});

	test("createGame leaves every clock frozen when not starting the clock", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { room } = await roomAndGame(t, code);
		const gameId = await t.run((ctx) => createGame(ctx, room, 60_000, false));
		const clocks = await clocksOf(t, gameId);
		expect(clocks.every((clock) => clock.turnedAt === undefined)).toBe(true);
	});

	test("countMoves counts the moves played in a game", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		const { game } = await roomAndGame(t, code);
		expect(await t.run((ctx) => countMoves(ctx, game._id))).toBe(0);
		await a.mutation(api.models.rooms.index.play, { code, move: tictactoeMove });
		await b.mutation(api.models.rooms.index.play, {
			code,
			move: { kind: "tictactoe", boardIndex: 1, cellIndex: 0 }
		});
		expect(await t.run((ctx) => countMoves(ctx, game._id))).toBe(2);
	});
});

describe("claimExpiredClock", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	async function claim(t: TestConvex, code: string) {
		const { room, game } = await roomAndGame(t, code);
		await t.run((ctx) => claimExpiredClock(ctx, room, game));
		return { room, game };
	}

	test("ends the round on timeout against the seat to move once its clock is out", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe", 10_000);
		vi.setSystemTime(1_010_000);
		const { room, game } = await claim(t, code);
		expect(await endedResultsOf(t, game._id)).toMatchObject([
			{ playerId: room.players[0], state: "timeout" }
		]);
		const expired = (await clocksOf(t, game._id)).find((c) => c.playerId === room.players[0]);
		expect(expired).toMatchObject({ remaining: 0 });
		expect(expired).not.toHaveProperty("turnedAt");
	});

	test("a flag against a lone king still loses", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { code } = await seatedRoom(t, "chess", 10_000);
		const { game } = await roomAndGame(t, code);
		await setGameState(t, game._id, LONE_BLACK_KING);
		vi.setSystemTime(1_010_000);
		await claim(t, code);
		const { room, game: claimed } = await roomAndGame(t, code);
		await t.run((ctx) => settleRound(ctx, room, claimed));
		expect(await standings(t, room.players, game._id)).toEqual([
			{ score: 0, rating: 392, mmr: -8 },
			{ score: 1, rating: 408, mmr: 8 }
		]);
	});

	test("leaves a seat with time left alone", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe", 10_000);
		vi.setSystemTime(1_009_999);
		const { game } = await claim(t, code);
		expect(await endedResultsOf(t, game._id)).toEqual([]);
	});
});

describe("settleRound", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	async function settle(
		t: TestConvex,
		code: string,
		options?: { shouldVoidIfUnfinished?: boolean }
	) {
		const { room, game } = await roomAndGame(t, code);
		await t.run((ctx) => settleRound(ctx, room, game, options));
		return await roomAndGame(t, code);
	}

	test("credits the board winner's score, both ratings, and both MMR changes", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { game } = await roomAndGame(t, code);
		await setGameState(t, game._id, decidedTictactoe());
		const { room, game: settled } = await settle(t, code);
		expect(settled.settledAt).toBeDefined();
		expect(await standings(t, room.players, game._id)).toEqual([
			{ score: 1, rating: 408, mmr: 8 },
			{ score: 0, rating: 392, mmr: -8 }
		]);
	});

	test("changes nothing when called again for a settled round", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { game } = await roomAndGame(t, code);
		await setGameState(t, game._id, decidedTictactoe());
		await settle(t, code);
		const { room } = await settle(t, code);
		expect(await standings(t, room.players, game._id)).toEqual([
			{ score: 1, rating: 408, mmr: 8 },
			{ score: 0, rating: 392, mmr: -8 }
		]);
	});

	test("credits nobody for a draw and marks it settled", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { game } = await roomAndGame(t, code);
		await setGameState(t, game._id, drawnTictactoe());
		const { room, game: settled } = await settle(t, code);
		expect(settled.settledAt).toBeDefined();
		expect(settled.isNoContest).toBeUndefined();
		expect(await standings(t, room.players, game._id)).toEqual([
			{ score: 0, rating: null, mmr: null },
			{ score: 0, rating: null, mmr: null }
		]);
	});

	test("credits seat 1 for a chess checkmate", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "chess");
		const { game } = await roomAndGame(t, code);
		await setGameState(t, game._id, FOOLS_MATE);
		const { room } = await settle(t, code);
		expect(await standings(t, room.players, game._id)).toEqual([
			{ score: 0, rating: 392, mmr: -8 },
			{ score: 1, rating: 408, mmr: 8 }
		]);
	});

	test("settles a chess stalemate as a draw", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "chess");
		const { game } = await roomAndGame(t, code);
		await setGameState(t, game._id, STALEMATE);
		const { room, game: settled } = await settle(t, code);
		expect(settled.settledAt).toBeDefined();
		expect(await standings(t, room.players, game._id)).toEqual([
			{ score: 0, rating: null, mmr: null },
			{ score: 0, rating: null, mmr: null }
		]);
	});

	test("writes nothing for an unfinished round", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { game: before } = await roomAndGame(t, code);
		const clocksBefore = await clocksOf(t, before._id);
		const { game } = await settle(t, code);
		expect(game.settledAt).toBeUndefined();
		expect(await clocksOf(t, game._id)).toEqual(clocksBefore);
	});

	test("voids an unfinished round when asked", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const { room, game } = await settle(t, code, { shouldVoidIfUnfinished: true });
		expect(game).toMatchObject({ isNoContest: true, settledAt: expect.any(Number) });
		expect(await standings(t, room.players, game._id)).toEqual([
			{ score: 0, rating: null, mmr: null },
			{ score: 0, rating: null, mmr: null }
		]);
	});

	test("makes a round with an empty seat no-contest without rating anyone", async () => {
		const t = setup();
		const host = await signIn(t, "user_host", "Hal");
		const { code } = await host.mutation(api.models.rooms.index.create, { type: "tictactoe" });
		const { game } = await roomAndGame(t, code);
		await setGameState(t, game._id, decidedTictactoe());
		const { room, game: settled } = await settle(t, code);
		expect(settled.isNoContest).toBe(true);
		expect(await t.run((ctx) => ctx.db.query("ratings").collect())).toEqual([]);
		expect(await standings(t, room.players, game._id)).toEqual([
			{ score: 0, rating: null, mmr: null }
		]);
	});

	test("stops every running clock and banks its remaining time", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe", 60_000);
		const { room, game } = await roomAndGame(t, code);
		await setGameState(t, game._id, decidedTictactoe());
		vi.setSystemTime(1_003_000);
		await settle(t, code);
		const clocks = await clocksOf(t, game._id);
		expect(clocks.every((clock) => clock.turnedAt === undefined)).toBe(true);
		expect(clocks.find((clock) => clock.playerId === room.players[0])?.remaining).toBe(57_000);
	});
});

describe("history", () => {
	async function playedRoom() {
		const t = setup();
		const room = await seatedRoom(t, "tictactoe");
		await room.a.mutation(api.models.rooms.index.play, { code: room.code, move: tictactoeMove });
		await room.b.mutation(api.models.rooms.index.play, {
			code: room.code,
			move: { kind: "tictactoe", boardIndex: 4, cellIndex: 4 }
		});
		return { t, ...room };
	}

	test("throws for a signed-out visitor", async () => {
		const { t, code } = await playedRoom();
		await expect(t.query(api.models.games.index.history, { code })).rejects.toThrow(
			"Sign in to play"
		);
	});

	test("throws for an identity with no stored user", async () => {
		const { t, code } = await playedRoom();
		const ghost = t.withIdentity({ subject: "user_ghost" });
		await expect(ghost.query(api.models.games.index.history, { code })).rejects.toThrow(
			"Sign in to play"
		);
	});

	test("returns the current game's moves in turn order", async () => {
		const { a, code } = await playedRoom();
		const moves = await a.query(api.models.games.index.history, { code });
		expect(moves.map((m) => m.turn)).toEqual([0, 1]);
		const last = moves[1].state;
		expect(last.kind === "tictactoe" && last.boards[4][4]).toBe("O");
	});

	test("records which player made each move", async () => {
		const { t, a, code } = await playedRoom();
		const { room } = await roomAndGame(t, code);
		const moves = await a.query(api.models.games.index.history, { code });
		expect(moves.map((m) => m.playerId)).toEqual(room.players);
	});

	test("a spectator with no seat can read the history", async () => {
		const { t, code } = await playedRoom();
		const spectator = await signIn(t, "user_spectator", "Spec");
		expect(await spectator.query(api.models.games.index.history, { code })).toHaveLength(2);
	});

	test("a player seated in a different room can read the history", async () => {
		const { t, code } = await playedRoom();
		const outsider = await signIn(t, "user_outsider", "Otto");
		await outsider.mutation(api.models.rooms.index.create, { type: "checkers" });
		expect(await outsider.query(api.models.games.index.history, { code })).toHaveLength(2);
	});

	test("returns an empty list for an unknown room", async () => {
		const { a } = await playedRoom();
		expect(await a.query(api.models.games.index.history, { code: "NOPE42" })).toEqual([]);
	});

	test("returns an earlier round's moves when asked by round", async () => {
		const { t, a, code } = await playedRoom();
		const { room } = await roomAndGame(t, code);
		await t.run((ctx) => createGame(ctx, room, 60_000, true));
		expect(await a.query(api.models.games.index.history, { code })).toEqual([]);
		expect(await a.query(api.models.games.index.history, { code, round: 1 })).toHaveLength(2);
	});

	test("returns the live round's moves for a round that doesn't exist yet", async () => {
		const { a, code } = await playedRoom();
		expect(await a.query(api.models.games.index.history, { code, round: 5 })).toHaveLength(2);
	});
});

describe("resign", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	test("throws for a signed-out visitor", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		await expect(t.mutation(api.models.games.index.resign, { code })).rejects.toThrow(
			"Sign in to play"
		);
	});

	test("throws for a spectator with no seat", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const spectator = await signIn(t, "user_spectator", "Spec");
		await expect(spectator.mutation(api.models.games.index.resign, { code })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("throws for a player seated in a different room", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const outsider = await signIn(t, "user_outsider", "Otto");
		await outsider.mutation(api.models.rooms.index.create, { type: "checkers" });
		await expect(outsider.mutation(api.models.games.index.resign, { code })).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("throws for an unknown room", async () => {
		const t = setup();
		const { a } = await seatedRoom(t, "tictactoe");
		await expect(a.mutation(api.models.games.index.resign, { code: "NOPE42" })).rejects.toThrow(
			"Room not found"
		);
	});

	test("throws once the room is closed", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const { room } = await roomAndGame(t, code);
		await closeRoom(t, room._id);
		await expect(a.mutation(api.models.games.index.resign, { code })).rejects.toThrow(
			"This room is no longer active"
		);
	});

	test("ends the round against the resigning player", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		const { room, game } = await roomAndGame(t, code);
		await b.mutation(api.models.games.index.resign, { code });
		const results = await endedResultsOf(t, game._id);
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ playerId: room.players[1], state: "resign" });
	});

	test("freezes the resigning player's running clock", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const { room, game } = await roomAndGame(t, code);
		await a.mutation(api.models.games.index.resign, { code });
		const clocks = await clocksOf(t, game._id);
		const own = clocks.find((clock) => clock.playerId === room.players[0]);
		expect(own).toBeDefined();
		expect(own).not.toHaveProperty("turnedAt");
	});

	test("banks the time used on the resigning player's own turn", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe", 60_000);
		vi.setSystemTime(1_003_000);
		await a.mutation(api.models.games.index.resign, { code });
		const { room, game } = await roomAndGame(t, code);
		const clocks = await clocksOf(t, game._id);
		expect(clocks.find((clock) => clock.playerId === room.players[0])).toMatchObject({
			remaining: 57_000
		});
		expect(clocks.some((clock) => clock.turnedAt !== undefined)).toBe(false);
	});

	test("an off-turn resign banks only the running clock", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe", 60_000);
		vi.setSystemTime(1_003_000);
		await b.mutation(api.models.games.index.resign, { code });
		const { room, game } = await roomAndGame(t, code);
		const clocks = await clocksOf(t, game._id);
		expect(clocks.find((clock) => clock.playerId === room.players[0])).toMatchObject({
			remaining: 57_000
		});
		expect(clocks.find((clock) => clock.playerId === room.players[1])).toMatchObject({
			remaining: 60_000
		});
		expect(clocks.some((clock) => clock.turnedAt !== undefined)).toBe(false);
	});

	test("does nothing once the round has already ended", async () => {
		const t = setup();
		const { a, b, code } = await seatedRoom(t, "tictactoe");
		const { room, game } = await roomAndGame(t, code);
		await a.mutation(api.models.games.index.resign, { code });
		await b.mutation(api.models.games.index.resign, { code });
		const results = await endedResultsOf(t, game._id);
		expect(results.map((r) => r.playerId)).toEqual([room.players[0]]);
	});

	test("does nothing when the board has already decided the round", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		const { game } = await roomAndGame(t, code);
		await setGameState(t, game._id, decidedTictactoe());
		await b.mutation(api.models.games.index.resign, { code });
		expect(await endedResultsOf(t, game._id)).toEqual([]);
	});

	test("throws when the caller has no clock in the current round", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const { room, game } = await roomAndGame(t, code);
		const own = (await clocksOf(t, game._id)).find((c) => c.playerId === room.players[0]);
		if (!own) throw new Error("expected a clock for seat 0");
		await t.run((ctx) => ctx.db.delete(own._id));
		await expect(a.mutation(api.models.games.index.resign, { code })).rejects.toThrow(
			"You are not playing this round"
		);
	});

	test("credits the opponent at once, with no rematch", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		const { room, game } = await roomAndGame(t, code);
		await b.mutation(api.models.games.index.resign, { code });
		const [ada] = await standings(t, room.players, game._id);
		expect(ada).toMatchObject({ score: 1, rating: 408 });
	});

	test("credits the opponent in a chess room", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "chess");
		const { room, game } = await roomAndGame(t, code);
		await a.mutation(api.models.games.index.resign, { code });
		const [, bea] = await standings(t, room.players, game._id);
		expect(bea).toMatchObject({ score: 1, rating: 408 });
	});

	test("rejects a resign while the second seat is still empty", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const { code } = await ada.mutation(api.models.rooms.index.create, { type: "tictactoe" });
		await expect(ada.mutation(api.models.games.index.resign, { code })).rejects.toThrow(
			"Waiting for opponent"
		);
	});
});

describe("timeout", () => {
	const TIME_CONTROL_MS = 10_000;
	const START = 5_000_000;

	afterEach(() => {
		vi.useRealTimers();
	});

	async function timedRoom() {
		vi.useFakeTimers();
		vi.setSystemTime(START);
		const t = setup();
		const room = await seatedRoom(t, "tictactoe", TIME_CONTROL_MS);
		const { room: doc, game } = await roomAndGame(t, room.code);
		return { t, ...room, room: doc, game };
	}

	test("throws for a signed-out visitor", async () => {
		const { t, code } = await timedRoom();
		await expect(t.mutation(api.models.games.index.timeout, { code })).rejects.toThrow(
			"Sign in to play"
		);
	});

	test("throws for an unknown room", async () => {
		const { a } = await timedRoom();
		await expect(a.mutation(api.models.games.index.timeout, { code: "NOPE42" })).rejects.toThrow(
			"Room not found"
		);
	});

	test("does nothing while the seat to move still has time", async () => {
		const { t, b, code, game } = await timedRoom();
		vi.setSystemTime(START + TIME_CONTROL_MS - 1);
		await b.mutation(api.models.games.index.timeout, { code });
		expect(await endedResultsOf(t, game._id)).toEqual([]);
	});

	test("ends the round against the seat to move once its clock runs out", async () => {
		const { t, b, code, room, game } = await timedRoom();
		vi.setSystemTime(START + TIME_CONTROL_MS);
		await b.mutation(api.models.games.index.timeout, { code });
		const results = await endedResultsOf(t, game._id);
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ playerId: room.players[0], state: "timeout" });
	});

	test("zeroes and freezes the expired clock", async () => {
		const { t, a, code, room, game } = await timedRoom();
		vi.setSystemTime(START + TIME_CONTROL_MS + 500);
		await a.mutation(api.models.games.index.timeout, { code });
		const expired = (await clocksOf(t, game._id)).find((c) => c.playerId === room.players[0]);
		expect(expired?.remaining).toBe(0);
		expect(expired).not.toHaveProperty("turnedAt");
	});

	test("a spectator can trigger an expired timeout", async () => {
		const { t, code, room, game } = await timedRoom();
		const spectator = await signIn(t, "user_spectator", "Spec");
		vi.setSystemTime(START + TIME_CONTROL_MS);
		await spectator.mutation(api.models.games.index.timeout, { code });
		const results = await endedResultsOf(t, game._id);
		expect(results).toMatchObject([{ playerId: room.players[0], state: "timeout" }]);
	});

	test("does nothing once the room is closed", async () => {
		const { t, a, code, room, game } = await timedRoom();
		await closeRoom(t, room._id);
		vi.setSystemTime(START + TIME_CONTROL_MS);
		await a.mutation(api.models.games.index.timeout, { code });
		expect(await endedResultsOf(t, game._id)).toEqual([]);
	});

	test("does nothing once the round has already ended", async () => {
		const { t, a, b, code, room, game } = await timedRoom();
		await b.mutation(api.models.games.index.resign, { code });
		vi.setSystemTime(START + TIME_CONTROL_MS);
		await a.mutation(api.models.games.index.timeout, { code });
		const results = await endedResultsOf(t, game._id);
		expect(results).toMatchObject([{ playerId: room.players[1], state: "resign" }]);
	});

	test("does nothing when the board has already decided the round", async () => {
		const { t, a, code, game } = await timedRoom();
		await setGameState(t, game._id, decidedTictactoe());
		vi.setSystemTime(START + TIME_CONTROL_MS);
		await a.mutation(api.models.games.index.timeout, { code });
		expect(await endedResultsOf(t, game._id)).toEqual([]);
	});

	test("does nothing while the clock is frozen waiting for an opponent", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(START);
		const t = setup();
		const host = await signIn(t, "user_host", "Hal");
		const { code } = await host.mutation(api.models.rooms.index.create, {
			type: "tictactoe",
			timeControlMs: TIME_CONTROL_MS
		});
		const { game } = await roomAndGame(t, code);
		vi.setSystemTime(START + TIME_CONTROL_MS * 10);
		await host.mutation(api.models.games.index.timeout, { code });
		expect(await endedResultsOf(t, game._id)).toEqual([]);
	});

	test("charges the seat to move after the turn passes", async () => {
		const { t, a, code, room, game } = await timedRoom();
		vi.setSystemTime(START + 1_000);
		await a.mutation(api.models.rooms.index.play, { code, move: tictactoeMove });
		vi.setSystemTime(START + 1_000 + TIME_CONTROL_MS);
		await a.mutation(api.models.games.index.timeout, { code });
		const results = await endedResultsOf(t, game._id);
		expect(results).toMatchObject([{ playerId: room.players[1], state: "timeout" }]);
	});

	test("credits the opponent at once, with no rematch", async () => {
		const { t, b, code, room, game } = await timedRoom();
		vi.setSystemTime(START + TIME_CONTROL_MS);
		await b.mutation(api.models.games.index.timeout, { code });
		const [, bea] = await standings(t, room.players, game._id);
		expect(bea).toMatchObject({ score: 1, rating: 408 });
	});

	test("gives the round to the timed-out seat's opponent on rematch", async () => {
		const { t, b, code, room, game } = await timedRoom();
		vi.setSystemTime(START + TIME_CONTROL_MS);
		await b.mutation(api.models.games.index.timeout, { code });
		await b.mutation(api.models.rooms.index.rematch, { code });
		const [ada, bea] = await t.run((ctx) =>
			Promise.all(
				room.players.map(async (id) => ({
					player: await ctx.db.get(id),
					result: await ctx.db
						.query("results")
						.withIndex("byGameAndPlayer", (q) => q.eq("gameId", game._id).eq("playerId", id))
						.unique()
				}))
			)
		);
		expect([ada?.player?.score, bea?.player?.score]).toEqual([0, 1]);
		expect([ada?.result?.mmr, bea?.result?.mmr]).toEqual([-8, 8]);
	});
});
