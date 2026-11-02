import { describe, expect, test } from "vitest";
import { GET } from "./+server.js";

describe("GET", () => {
	test("serves robots.txt naming the sitemap", async () => {
		const response = GET();
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
		const body = await response.text();
		expect(body).toContain("User-agent: *");
		expect(body).toContain("Sitemap: https://twoplay.xyz/sitemap.xml");
	});
});
