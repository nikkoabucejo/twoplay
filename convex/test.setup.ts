/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import type { GameType } from "./models/games/index.js";

export const modules = import.meta.glob([
	"./**/*.ts",
	"./**/*.js",
	"!./**/*.test.ts",
	"!./**/*.d.ts",
	"!./test.setup.ts"
]);

export function setup() {
	return convexTest(schema, modules);
}

export type TestConvex = ReturnType<typeof setup>;

/** Signed-in accessor with a stored `users` row. */
export async function signIn(t: TestConvex, subject: string, name = subject) {
	const as = t.withIdentity({ subject, name });
	await as.mutation(api.models.users.index.store, { name });
	return as;
}

/** Two signed-in users seated in one new room (seat 0 created it, seat 1 joined). */
export async function seatedRoom(t: TestConvex, type: GameType, timeControlMs?: number) {
	const a = await signIn(t, "user_a", "Ada");
	const b = await signIn(t, "user_b", "Bea");
	const { code } = await a.mutation(api.models.rooms.index.create, { type, timeControlMs });
	await b.mutation(api.models.rooms.index.join, { code });
	return { a, b, code };
}
