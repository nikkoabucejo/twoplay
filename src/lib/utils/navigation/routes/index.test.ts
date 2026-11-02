import { describe, expect, test } from "vitest";
import {
	NAV_ITEMS,
	isCurrentPath,
	isGameRoomRoute,
	isGatedRoute,
	liveGameHref,
	showsDock
} from "./index.js";

describe("isGameRoomRoute", () => {
	test("is true for routes with a room code segment", () => {
		expect(isGameRoomRoute("/(games)/tictactoe/[code]/[[round]]")).toBe(true);
		expect(isGameRoomRoute("/(games)/checkers/[code]/[[round]]")).toBe(true);
	});

	test("is false for the landing page, other pages, and unmatched routes", () => {
		expect(isGameRoomRoute("/(games)")).toBe(false);
		expect(isGameRoomRoute("/play")).toBe(false);
		expect(isGameRoomRoute(null)).toBe(false);
	});
});

describe("isGatedRoute", () => {
	test.each([
		"/(games)/tictactoe/[code]/[[round]]",
		"/(games)/checkers/[code]/[[round]]",
		"/play",
		"/lobby",
		"/history",
		"/leaderboard",
		"/me"
	])("%s is gated", (routeId) => {
		expect(isGatedRoute(routeId)).toBe(true);
	});

	test.each([
		"/(games)",
		"/learn",
		"/learn/[game]",
		"/tour",
		"/about",
		"/privacy",
		"/terms",
		"/settings",
		null
	])("%s is not gated", (routeId) => {
		expect(isGatedRoute(routeId)).toBe(false);
	});
});

describe("showsDock", () => {
	test.each([
		["/(games)/tictactoe/[code]/[[round]]", true, false],
		["/(games)/tictactoe/[code]/[[round]]", false, false],
		["/play", true, true],
		["/play", false, false]
	])("on %s with member navigation %s is %s", (routeId, showsMemberNav, expected) => {
		expect(showsDock(routeId, showsMemberNav)).toBe(expected);
	});
});

describe("isCurrentPath", () => {
	test("matches the exact path", () => {
		expect(isCurrentPath("/lobby", "/lobby")).toBe(true);
	});

	test("matches a nested path at a segment boundary", () => {
		expect(isCurrentPath("/history/x", "/history")).toBe(true);
	});

	test("does not match a prefix without a segment boundary", () => {
		expect(isCurrentPath("/playground", "/play")).toBe(false);
	});

	test("home is current only on itself", () => {
		expect(isCurrentPath("/play", "/")).toBe(false);
		expect(isCurrentPath("/", "/")).toBe(true);
	});
});

describe("liveGameHref", () => {
	const active = { code: "ABCD", type: "tictactoe" } as const;

	test("is null without an active room", () => {
		expect(liveGameHref(null, "/history")).toBeNull();
		expect(liveGameHref(undefined, "/history")).toBeNull();
	});

	test("is null inside that room", () => {
		expect(liveGameHref(active, "/tictactoe/ABCD")).toBeNull();
		expect(liveGameHref(active, "/tictactoe/ABCD/2")).toBeNull();
	});

	test("links to the room from anywhere else", () => {
		expect(liveGameHref(active, "/history")).toBe("/tictactoe/ABCD");
	});
});

describe("NAV_ITEMS", () => {
	test("lists the member pages in order", () => {
		expect(NAV_ITEMS.map((item) => item.href)).toEqual([
			"/play",
			"/lobby",
			"/history",
			"/leaderboard"
		]);
	});

	test("leaves home to the wordmark", () => {
		expect(NAV_ITEMS.map((item) => item.href)).not.toContain("/");
	});
});
