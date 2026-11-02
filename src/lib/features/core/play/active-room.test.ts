import { describe, expect, test } from "vitest";
import { playView } from "./active-room.js";

describe("playView", () => {
	const room = { code: "ABCD", type: "tictactoe" } as const;
	const idle = { seatCount: undefined, isQueued: false, startedHere: false, isPending: false };

	test("checks while the active room is loading", () => {
		expect(playView({ ...idle, room: undefined })).toEqual({ kind: "checking", redirect: null });
	});

	test("shows setup without an active room", () => {
		expect(playView({ ...idle, room: null })).toEqual({ kind: "setup", redirect: null });
	});

	test("waits for an opponent when the active room has one seat", () => {
		expect(playView({ ...idle, room, seatCount: 1 })).toEqual({ kind: "waiting", redirect: null });
	});

	test("shows a two-seat room found on load without redirecting", () => {
		expect(playView({ ...idle, room, seatCount: 2 })).toEqual({ kind: "playing", redirect: null });
	});

	test("redirects into a two-seat room this page started", () => {
		expect(playView({ ...idle, room, seatCount: 2, startedHere: true }).redirect).toBe(
			"/tictactoe/ABCD"
		);
	});

	test("checks while the active room's seats load", () => {
		expect(playView({ ...idle, room }).kind).toBe("checking");
	});

	test("stays pending while the seats of a room this page started load", () => {
		expect(playView({ ...idle, room, startedHere: true }).kind).toBe("pending");
	});

	test("shows the queue while queued", () => {
		expect(playView({ ...idle, room: null, isQueued: true })).toEqual({
			kind: "queued",
			redirect: null
		});
	});

	test("is pending while a start call is in flight", () => {
		expect(playView({ ...idle, room: null, isPending: true }).kind).toBe("pending");
	});

	test("stays pending when the created room shows before the call resolves", () => {
		expect(playView({ ...idle, room, seatCount: 1, isPending: true }).kind).toBe("pending");
	});
});
