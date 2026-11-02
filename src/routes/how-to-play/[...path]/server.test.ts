import { isRedirect } from "@sveltejs/kit";
import { describe, expect, test } from "vitest";
import { GET } from "./+server.js";

function redirectFrom(href: string) {
	try {
		GET({ url: new URL(href) } as Parameters<typeof GET>[0]);
	} catch (caught) {
		return caught;
	}
}

describe("GET", () => {
	test("redirects the old index to /learn", () => {
		const thrown = redirectFrom("https://twoplay.xyz/how-to-play");
		expect(isRedirect(thrown) && [thrown.status, thrown.location]).toEqual([308, "/learn"]);
	});

	test("redirects an old game page to /learn, keeping the query", () => {
		const thrown = redirectFrom("https://twoplay.xyz/how-to-play/checkers?x=1");
		expect(isRedirect(thrown) && [thrown.status, thrown.location]).toEqual([
			308,
			"/learn/checkers?x=1"
		]);
	});

	test("keeps a percent-encoded path encoded", () => {
		const thrown = redirectFrom("https://twoplay.xyz/how-to-play/%E2%9C%93");
		expect(isRedirect(thrown) && [thrown.status, thrown.location]).toEqual([
			308,
			"/learn/%E2%9C%93"
		]);
	});
});
