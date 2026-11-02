import { describe, expect, test } from "vitest";
import { activeRoomRedirect } from "./active-room.js";

describe("activeRoomRedirect", () => {
	const room = { code: "ABCD", type: "tictactoe" } as const;

	test("redirects into a room the user already has", () => {
		expect(activeRoomRedirect({ room, createdCode: null, isCreating: false })).toBe(
			"/tictactoe/ABCD"
		);
	});

	test("stays put without an active room", () => {
		expect(activeRoomRedirect({ room: null, createdCode: null, isCreating: false })).toBeNull();
	});

	test("stays put while the create mutation is in flight", () => {
		expect(activeRoomRedirect({ room, createdCode: null, isCreating: true })).toBeNull();
	});

	test("stays put on the invite screen for the room just created", () => {
		expect(activeRoomRedirect({ room, createdCode: "ABCD", isCreating: false })).toBeNull();
	});
});
