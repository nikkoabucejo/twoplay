import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import type { TictactoeState } from "../games/tictactoe/index.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getCurrentGame } from "../games/index.js";
import { getRoomByCode, requireUser } from "./auth.js";

const { abandon, create, history, rematch, stats, statsForUsers } = api.models.rooms.index;
const { resign } = api.models.games.index;

type Board = TictactoeState["boards"][number];
const EMPTY: Board = Array(9).fill(null);
const X_WON: Board = ["X", "X", "X", null, null, null, null, null, null];
const O_WON: Board = ["O", "O", "O", null, null, null, null, null, null];
const DRAWN: Board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];

const SEAT_0_WINS = [X_WON, X_WON, X_WON, ...Array<Board>(6).fill(EMPTY)];
const SEAT_1_WINS = [O_WON, O_WON, O_WON, ...Array<Board>(6).fill(EMPTY)];
const DRAW = Array<Board>(9).fill(DRAWN);

const START = 1_000_000;

async function setBoards(t: TestConvex, code: string, boards: Board[]) {
	await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const game = await getCurrentGame(ctx, room._id);
		if (!game) throw new Error(`No game in room ${code}`);
		await ctx.db.patch(game._id, { state: { kind: "tictactoe", boards } });
	});
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

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(START);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("history", () => {
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
				games: [{ round: 1, createdAt: expect.closeTo(START, 0), result: "playing", mmr: null }]
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
