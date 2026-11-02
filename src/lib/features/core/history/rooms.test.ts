import { describe, expect, test } from "vitest";
import { splitHistory } from "./rooms.js";

const rooms = [{ code: "WXYZ" }, { code: "ABCD" }, { code: "EFGH" }];

describe("splitHistory", () => {
	test("lists every room when none was active in this view", () => {
		expect(splitHistory(rooms, null, new Set())).toEqual({ list: rooms, held: [] });
		expect(splitHistory(rooms, undefined, new Set())).toEqual({ list: rooms, held: [] });
	});

	test("drops the active room and keeps the order of the rest", () => {
		expect(splitHistory(rooms, "ABCD", new Set())).toEqual({
			list: [{ code: "WXYZ" }, { code: "EFGH" }],
			held: []
		});
	});

	test("lists every room when the active code is not in the history", () => {
		expect(splitHistory(rooms, "QRST", new Set(["QRST"]))).toEqual({ list: rooms, held: [] });
	});

	test("holds finished rooms newest first, in the history's order", () => {
		expect(splitHistory(rooms, null, new Set(["EFGH", "WXYZ"]))).toEqual({
			list: [{ code: "ABCD" }],
			held: [{ code: "WXYZ" }, { code: "EFGH" }]
		});
	});

	test("leaves the active room out of both the list and the held rooms", () => {
		expect(splitHistory(rooms, "ABCD", new Set(["ABCD"]))).toEqual({
			list: [{ code: "WXYZ" }, { code: "EFGH" }],
			held: []
		});
	});

	test("holds a room that was active earlier in this view and has since finished", () => {
		expect(splitHistory(rooms, null, new Set(["ABCD"]))).toEqual({
			list: [{ code: "WXYZ" }, { code: "EFGH" }],
			held: [{ code: "ABCD" }]
		});
	});

	test("holds the finished room while a newer room is active", () => {
		expect(splitHistory(rooms, "WXYZ", new Set(["ABCD", "WXYZ"]))).toEqual({
			list: [{ code: "EFGH" }],
			held: [{ code: "ABCD" }]
		});
	});

	test("ignores seen codes that are not in the history yet", () => {
		expect(splitHistory(rooms, null, new Set(["QRST"]))).toEqual({ list: rooms, held: [] });
	});
});
