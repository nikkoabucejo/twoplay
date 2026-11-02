import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api.js";
import type { Doc } from "../../_generated/dataModel.js";
import { seatedRoom, setup, signIn, type TestConvex } from "../../test.setup.js";
import {
	currentPlayer,
	getActiveRoomForUser,
	getRoomByCode,
	isRoomActive,
	requirePlayer,
	requireUser
} from "./auth.js";

async function roomIdOf(t: TestConvex, code: string) {
	return await t.run(async (ctx) => {
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error(`No room ${code}`);
		return room._id;
	});
}

async function patchRoom(t: TestConvex, code: string, fields: Partial<Doc<"rooms">>) {
	const roomId = await roomIdOf(t, code);
	await t.run((ctx) => ctx.db.patch(roomId, fields));
}

describe("requireUser", () => {
	test("rejects a signed-out caller", async () => {
		const t = setup();
		await expect(t.run((ctx) => requireUser(ctx))).rejects.toThrow("Sign in to play");
	});

	test("rejects an identity with no stored user row", async () => {
		const t = setup();
		const ghost = t.withIdentity({ subject: "user_ghost", name: "Ghost" });
		await expect(ghost.run((ctx) => requireUser(ctx))).rejects.toThrow("Sign in to play");
	});

	test("returns the caller's user row", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const user = await ada.run((ctx) => requireUser(ctx));
		expect(user).toMatchObject({ name: "Ada", clerk__userId: "user_a" });
	});
});

describe("currentPlayer", () => {
	test("returns null for a signed-in visitor without a seat", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		const roomId = await roomIdOf(t, code);
		expect(await cy.run((ctx) => currentPlayer(ctx, roomId))).toBeNull();
	});

	test("returns the seated caller's player row", async () => {
		const t = setup();
		const { b, code } = await seatedRoom(t, "tictactoe");
		const roomId = await roomIdOf(t, code);
		const player = await b.run((ctx) => currentPlayer(ctx, roomId));
		expect(player?.name).toBe("Bea");
	});

	test("rejects a signed-out caller", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const roomId = await roomIdOf(t, code);
		await expect(t.run((ctx) => currentPlayer(ctx, roomId))).rejects.toThrow("Sign in to play");
	});
});

describe("requirePlayer", () => {
	test("rejects a signed-in visitor without a seat", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "tictactoe");
		const cy = await signIn(t, "user_c", "Cy");
		const roomId = await roomIdOf(t, code);
		await expect(cy.run((ctx) => requirePlayer(ctx, roomId))).rejects.toThrow(
			"You are not a player in this room"
		);
	});

	test("returns the seated caller's player row", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const roomId = await roomIdOf(t, code);
		const player = await a.run((ctx) => requirePlayer(ctx, roomId));
		expect(player.name).toBe("Ada");
	});
});

describe("getRoomByCode", () => {
	test("finds a room by its code", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "checkers");
		const room = await t.run((ctx) => getRoomByCode(ctx, code));
		expect(room).toMatchObject({ code, type: "checkers" });
	});

	test("returns null for an unknown code", async () => {
		const t = setup();
		expect(await t.run((ctx) => getRoomByCode(ctx, "ZZZZZZ"))).toBeNull();
	});

	test("finds a room by its lowercase code", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "checkers");
		const room = await t.run((ctx) => getRoomByCode(ctx, code.toLowerCase()));
		expect(room?.code).toBe(code);
	});

	test("finds a room by a code with surrounding whitespace", async () => {
		const t = setup();
		const { code } = await seatedRoom(t, "checkers");
		const room = await t.run((ctx) => getRoomByCode(ctx, `  ${code}\n`));
		expect(room?.code).toBe(code);
	});
});

describe("isRoomActive", () => {
	test("treats a room without a status as active", () => {
		expect(isRoomActive({})).toBe(true);
	});

	test("treats an active room as active", () => {
		expect(isRoomActive({ status: "active" })).toBe(true);
	});

	test("treats a closed room as inactive", () => {
		expect(isRoomActive({ status: "closed" })).toBe(false);
	});
});

describe("getActiveRoomForUser", () => {
	test("returns null for a user who has never joined a room", async () => {
		const t = setup();
		const ada = await signIn(t, "user_a", "Ada");
		const room = await ada.run(async (ctx) => {
			const user = await requireUser(ctx);
			return getActiveRoomForUser(ctx, user._id);
		});
		expect(room).toBeNull();
	});

	test("returns the room the user is seated in", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const room = await a.run(async (ctx) => {
			const user = await requireUser(ctx);
			return getActiveRoomForUser(ctx, user._id);
		});
		expect(room?.code).toBe(code);
	});

	test("skips a room the user has left", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		const roomId = await roomIdOf(t, code);
		await a.run(async (ctx) => {
			const player = await requirePlayer(ctx, roomId);
			await ctx.db.patch(player._id, { leftAt: Date.now() });
		});
		const room = await a.run(async (ctx) => {
			const user = await requireUser(ctx);
			return getActiveRoomForUser(ctx, user._id);
		});
		expect(room).toBeNull();
	});

	test("skips a closed room", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await patchRoom(t, code, { status: "closed" });
		const room = await a.run(async (ctx) => {
			const user = await requireUser(ctx);
			return getActiveRoomForUser(ctx, user._id);
		});
		expect(room).toBeNull();
	});

	test("returns a room that predates the status field", async () => {
		const t = setup();
		const { a, code } = await seatedRoom(t, "tictactoe");
		await patchRoom(t, code, { status: undefined });
		const room = await a.run(async (ctx) => {
			const user = await requireUser(ctx);
			return getActiveRoomForUser(ctx, user._id);
		});
		expect(room?.code).toBe(code);
	});

	test("finds the active room among older closed ones", async () => {
		const t = setup();
		const { a, code: oldCode } = await seatedRoom(t, "tictactoe");
		await a.mutation(api.models.rooms.index.abandon, { code: oldCode });
		const { code: newCode } = await a.mutation(api.models.rooms.index.create, {
			type: "checkers"
		});
		const room = await a.run(async (ctx) => {
			const user = await requireUser(ctx);
			return getActiveRoomForUser(ctx, user._id);
		});
		expect(room?.code).toBe(newCode);
	});
});
