import { describe, expect, test } from "vitest";
import { withoutActiveRoom } from "./rooms.js";

const rooms = [{ code: "WXYZ" }, { code: "ABCD" }, { code: "EFGH" }];

describe("withoutActiveRoom", () => {
	test("drops the active room and keeps the order of the rest", () => {
		expect(withoutActiveRoom(rooms, "ABCD")).toEqual([{ code: "WXYZ" }, { code: "EFGH" }]);
	});

	test("returns the same rooms without an active code", () => {
		expect(withoutActiveRoom(rooms, null)).toEqual(rooms);
		expect(withoutActiveRoom(rooms, undefined)).toEqual(rooms);
	});

	test("returns the same rooms when the active code is not in the list", () => {
		expect(withoutActiveRoom(rooms, "QRST")).toEqual(rooms);
	});
});
