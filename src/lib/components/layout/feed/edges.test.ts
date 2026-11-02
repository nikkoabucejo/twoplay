import { describe, expect, test } from "vitest";
import { feedEdges } from "./edges.js";

describe("feedEdges", () => {
	test("content that fits has no edges", () => {
		expect(feedEdges({ scrollTop: 0, scrollHeight: 200, clientHeight: 200 })).toEqual({
			top: false,
			bottom: false
		});
	});

	test("at the top with overflow has only a bottom edge", () => {
		expect(feedEdges({ scrollTop: 0, scrollHeight: 500, clientHeight: 200 })).toEqual({
			top: false,
			bottom: true
		});
	});

	test("in the middle has both edges", () => {
		expect(feedEdges({ scrollTop: 150, scrollHeight: 500, clientHeight: 200 })).toEqual({
			top: true,
			bottom: true
		});
	});

	test("within 1px of the bottom has only a top edge", () => {
		expect(feedEdges({ scrollTop: 299.5, scrollHeight: 500, clientHeight: 200 })).toEqual({
			top: true,
			bottom: false
		});
	});
});
