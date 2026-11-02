import { describe, expect, test } from "vitest";
import { GET } from "./+server.js";

describe("GET", () => {
	test("serves a sitemap of the indexed pages only", async () => {
		const response = GET();
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
		const locs = [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
		expect(locs).toEqual(["https://twoplay.xyz/", "https://twoplay.xyz/play"]);
	});
});
