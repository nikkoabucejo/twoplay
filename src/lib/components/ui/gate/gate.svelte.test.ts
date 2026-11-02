import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ClerkAuth } from "$lib/services/auth";
import { Gate } from "./index.js";

vi.mock("@clerk/clerk-js", () => ({ Clerk: class {} }));
vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));

const context = vi.hoisted(() => ({ auth: null as ClerkAuth | null }));

vi.mock("$lib/services/auth", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/services/auth")>()),
	getClerkAuth: () => context.auth
}));

beforeEach(() => {
	context.auth = new ClerkAuth();
	context.auth.hydrate(null);
});

describe("Gate", () => {
	test("shows the message and a Sign in button", () => {
		render(Gate, { props: { message: "Sign in to see your games." } });
		expect(screen.getByText("Sign in to see your games.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
	});

	test("Sign in opens the sign-in flow", async () => {
		const signIn = vi.spyOn(context.auth as ClerkAuth, "signIn");
		render(Gate, { props: { message: "x" } });
		await fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
		expect(signIn).toHaveBeenCalledOnce();
	});

	test("Sign in is disabled when the auth client failed to load", () => {
		(context.auth as ClerkAuth).loadError = "Failed to load @clerk/ui bundle";
		render(Gate, { props: { message: "x" } });
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
	});
});
