import { expect, test } from "vitest";
import { api } from "../../_generated/api.js";
import { setup, signIn, type TestConvex } from "../../test.setup.js";
import { userByClerkUserId } from "./index.js";

const store = api.models.users.index.store;

function storedUser(t: TestConvex, subject: string) {
	return t.run((ctx) => userByClerkUserId(ctx, subject));
}

function countUsers(t: TestConvex) {
	return t.run(async (ctx) => (await ctx.db.query("users").collect()).length);
}

test("store creates a user keyed by the identity's subject", async () => {
	const t = setup();
	await t.withIdentity({ subject: "user_1" }).mutation(store, { name: "Ada" });

	expect(await storedUser(t, "user_1")).toMatchObject({ name: "Ada", clerk__userId: "user_1" });
});

test("store trims surrounding whitespace from the name", async () => {
	const t = setup();
	await t.withIdentity({ subject: "user_1" }).mutation(store, { name: "  Ada \n" });

	expect((await storedUser(t, "user_1"))?.name).toBe("Ada");
});

test("store caps the name at 100 characters", async () => {
	const t = setup();
	await t.withIdentity({ subject: "user_1" }).mutation(store, { name: "a".repeat(150) });

	expect((await storedUser(t, "user_1"))?.name).toBe("a".repeat(100));
});

test("store keeps a name of exactly 100 characters intact", async () => {
	const t = setup();
	const name = "b".repeat(100);
	await t.withIdentity({ subject: "user_1" }).mutation(store, { name });

	expect((await storedUser(t, "user_1"))?.name).toBe(name);
});

test.fails("store trims whitespace exposed by the 100-character cap", async () => {
	// Trims before slicing, so a space landing at position 100 survives as a trailing space.
	const t = setup();
	await t.withIdentity({ subject: "user_1" }).mutation(store, { name: `${"a".repeat(99)} tail` });

	expect((await storedUser(t, "user_1"))?.name).toBe("a".repeat(99));
});

test("store rejects an empty name", async () => {
	const t = setup();

	await expect(t.withIdentity({ subject: "user_1" }).mutation(store, { name: "" })).rejects.toThrow(
		"Name can't be empty"
	);
});

test("store rejects a whitespace-only name without creating a user", async () => {
	const t = setup();

	await expect(
		t.withIdentity({ subject: "user_1" }).mutation(store, { name: "   " })
	).rejects.toThrow("Name can't be empty");
	expect(await storedUser(t, "user_1")).toBeNull();
});

test("store renames an existing user in place", async () => {
	const t = setup();
	const as = await signIn(t, "user_1", "Ada");
	await as.mutation(store, { name: "Ada Lovelace" });

	expect((await storedUser(t, "user_1"))?.name).toBe("Ada Lovelace");
	expect(await countUsers(t)).toBe(1);
});

test("store keeps one user per identity when called again with the same name", async () => {
	const t = setup();
	const as = await signIn(t, "user_1", "Ada");
	const before = await storedUser(t, "user_1");
	await as.mutation(store, { name: "Ada" });

	expect(await storedUser(t, "user_1")).toEqual(before);
	expect(await countUsers(t)).toBe(1);
});

test("store rejects a rename to an empty name and keeps the old one", async () => {
	const t = setup();
	const as = await signIn(t, "user_1", "Ada");

	await expect(as.mutation(store, { name: " " })).rejects.toThrow("Name can't be empty");
	expect((await storedUser(t, "user_1"))?.name).toBe("Ada");
});

test("store keeps separate users for separate identities", async () => {
	const t = setup();
	await signIn(t, "user_1", "Ada");
	await signIn(t, "user_2", "Bea");

	expect((await storedUser(t, "user_1"))?.name).toBe("Ada");
	expect((await storedUser(t, "user_2"))?.name).toBe("Bea");
});

test("store rejects a signed-out caller", async () => {
	const t = setup();

	await expect(t.mutation(store, { name: "Ada" })).rejects.toThrow(
		"Called store without authentication present"
	);
	expect(await countUsers(t)).toBe(0);
});

test("userByClerkUserId returns null for an unknown subject", async () => {
	const t = setup();
	await signIn(t, "user_1", "Ada");

	expect(await storedUser(t, "user_2")).toBeNull();
});
