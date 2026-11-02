import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../_generated/api.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import { getRoomByCode } from "../rooms/auth.js";
import { playerByUserAndRoom } from "../players/index.js";
import { userByClerkUserId } from "../users/index.js";

const { update, clear, list } = api.models.cursors.index;

afterEach(() => {
	vi.useRealTimers();
});

/** Every cursor row in the room, each tagged with its owner's clerk subject. */
function cursorsIn(t: TestConvex, code: string) {
	return t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		const rows = await ctx.db
			.query("cursors")
			.withIndex("byRoom", (q) => q.eq("roomId", room._id))
			.collect();
		return await Promise.all(
			rows.map(async (row) => {
				const player = await ctx.db.get(row.playerId);
				const user = player && (await ctx.db.get(player.userId));
				return { subject: user?.clerk__userId, x: row.x, y: row.y, updatedAt: row.updatedAt };
			})
		);
	});
}

function playerIdOf(t: TestConvex, subject: string, code: string) {
	return t.run(async (ctx) => {
		const user = await userByClerkUserId(ctx, subject);
		const room = await getRoomByCode(ctx, code);
		const player = user && room && (await playerByUserAndRoom(ctx, user._id, room._id));
		if (!player) throw new Error(`No seat for ${subject} in room ${code}`);
		return player._id;
	});
}

test("update stores the caller's cursor with the current time", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0.25, y: 0.75 });

	expect(await cursorsIn(t, code)).toEqual([
		{ subject: "user_a", x: 0.25, y: 0.75, updatedAt: Date.parse("2026-01-01T12:00:00Z") }
	]);
});

test("update moves the caller's existing cursor instead of adding another", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0.1, y: 0.1 });
	vi.setSystemTime(new Date("2026-01-01T12:00:01Z"));
	await a.mutation(update, { code, x: 0.9, y: 0.4 });

	expect(await cursorsIn(t, code)).toEqual([
		{ subject: "user_a", x: 0.9, y: 0.4, updatedAt: Date.parse("2026-01-01T12:00:01Z") }
	]);
});

test("update keeps one cursor per player in the room", async () => {
	const t = setup();
	const { a, b, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0.1, y: 0.2 });
	await b.mutation(update, { code, x: 0.3, y: 0.4 });
	await a.mutation(update, { code, x: 0.5, y: 0.6 });

	const rows = await cursorsIn(t, code);
	expect(rows.map((row) => [row.subject, row.x, row.y]).sort()).toEqual([
		["user_a", 0.5, 0.6],
		["user_b", 0.3, 0.4]
	]);
});

test("update accepts the 0 and 1 edges of the tracked area", async () => {
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0, y: 1 });

	expect(await cursorsIn(t, code)).toMatchObject([{ x: 0, y: 1 }]);
});

test.fails("update clamps coordinates outside 0-1 into the tracked area", async () => {
	// Stores client values as-is; the schema documents x/y as normalized 0-1 but nothing enforces it.
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: -3, y: 42 });

	expect(await cursorsIn(t, code)).toMatchObject([{ x: 0, y: 1 }]);
});

test("update rejects an unknown room", async () => {
	const t = setup();
	const as = await signIn(t, "user_1");

	await expect(as.mutation(update, { code: "NOPE42", x: 0.5, y: 0.5 })).rejects.toThrow(
		"Room not found"
	);
});

test("update rejects a caller who isn't seated in the room", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");
	const spectator = await signIn(t, "user_c", "Cy");

	await expect(spectator.mutation(update, { code, x: 0.5, y: 0.5 })).rejects.toThrow(
		"You are not a player in this room"
	);
	expect(await cursorsIn(t, code)).toHaveLength(0);
});

test("update rejects a signed-out caller", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");

	await expect(t.mutation(update, { code, x: 0.5, y: 0.5 })).rejects.toThrow("Sign in to play");
});

test("clear removes the caller's cursor", async () => {
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0.5, y: 0.5 });
	await a.mutation(clear, { code });

	expect(await cursorsIn(t, code)).toHaveLength(0);
});

test("clear leaves the opponent's cursor in place", async () => {
	const t = setup();
	const { a, b, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0.1, y: 0.1 });
	await b.mutation(update, { code, x: 0.9, y: 0.9 });
	await a.mutation(clear, { code });

	expect((await cursorsIn(t, code)).map((row) => row.subject)).toEqual(["user_b"]);
});

test("clear does nothing for a player without a cursor", async () => {
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");

	await expect(a.mutation(clear, { code })).resolves.toBeNull();
});

test("clear ignores an unknown room", async () => {
	const t = setup();
	const as = await signIn(t, "user_1");

	await expect(as.mutation(clear, { code: "NOPE42" })).resolves.toBeNull();
});

test("clear ignores a spectator and leaves the players' cursors alone", async () => {
	const t = setup();
	const { a, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0.5, y: 0.5 });
	const spectator = await signIn(t, "user_c", "Cy");
	await spectator.mutation(clear, { code });

	expect(await cursorsIn(t, code)).toHaveLength(1);
});

test("clear rejects a signed-out caller", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");

	await expect(t.mutation(clear, { code })).rejects.toThrow("Sign in to play");
});

test("list shows the opponent's cursor with their name and seat", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
	const t = setup();
	const { a, b, code } = await seatedRoom(t, "tictactoe");
	await b.mutation(update, { code, x: 0.3, y: 0.6 });

	expect(await a.query(list, { code })).toEqual([
		{
			playerId: await playerIdOf(t, "user_b", code),
			name: "Bea",
			index: 1,
			x: 0.3,
			y: 0.6,
			updatedAt: Date.parse("2026-01-01T12:00:00Z")
		}
	]);
});

test("list leaves out the viewer's own cursor", async () => {
	const t = setup();
	const { a, b, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0.1, y: 0.1 });
	await b.mutation(update, { code, x: 0.9, y: 0.9 });

	expect((await a.query(list, { code })).map((cursor) => cursor.name)).toEqual(["Bea"]);
	expect((await b.query(list, { code })).map((cursor) => cursor.name)).toEqual(["Ada"]);
});

test("list shows a spectator every player's cursor", async () => {
	const t = setup();
	const { a, b, code } = await seatedRoom(t, "tictactoe");
	await a.mutation(update, { code, x: 0.1, y: 0.1 });
	await b.mutation(update, { code, x: 0.9, y: 0.9 });
	const spectator = await signIn(t, "user_c", "Cy");

	const cursors = await spectator.query(list, { code });
	expect(cursors.map((cursor) => [cursor.name, cursor.index]).sort()).toEqual([
		["Ada", 0],
		["Bea", 1]
	]);
});

test("list only returns cursors from the requested room", async () => {
	const t = setup();
	const { b, code } = await seatedRoom(t, "tictactoe");
	await b.mutation(update, { code, x: 0.5, y: 0.5 });
	const c = await signIn(t, "user_c", "Cy");
	const other = await c.mutation(api.models.rooms.index.create, { type: "checkers" });
	await c.mutation(update, { code: other.code, x: 0.2, y: 0.2 });

	expect((await c.query(list, { code })).map((cursor) => cursor.name)).toEqual(["Bea"]);
});

test("list returns nothing for an unknown room", async () => {
	const t = setup();
	const as = await signIn(t, "user_1");

	expect(await as.query(list, { code: "NOPE42" })).toEqual([]);
});

test("list rejects a signed-out caller", async () => {
	const t = setup();
	const { code } = await seatedRoom(t, "tictactoe");

	await expect(t.query(list, { code })).rejects.toThrow("Sign in to play");
});
