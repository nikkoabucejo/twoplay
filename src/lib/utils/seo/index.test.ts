import { describe, expect, test } from "vitest";
import {
	INDEXED_PATHS,
	SITE_URL,
	canonicalUrl,
	isIndexable,
	landingJsonLd,
	robotsTxt,
	serializeJsonLd,
	sitemapXml
} from "./index.js";

describe("SITE_URL", () => {
	test("is the production origin", () => {
		expect(SITE_URL).toBe("https://twoplay.xyz");
	});
});

describe("INDEXED_PATHS", () => {
	test("lists the landing and play pages", () => {
		expect(INDEXED_PATHS).toEqual(["/", "/play"]);
	});
});

describe("isIndexable", () => {
	test("accepts indexed paths on the production origin", () => {
		expect(isIndexable(new URL("https://twoplay.xyz/"))).toBe(true);
		expect(isIndexable(new URL("https://twoplay.xyz/play?game=checkers"))).toBe(true);
	});

	test("rejects rooms, history, lobby, and leaderboard", () => {
		for (const path of ["/tictactoe/ABCD", "/history", "/lobby", "/leaderboard"]) {
			expect(isIndexable(new URL(path, SITE_URL))).toBe(false);
		}
	});

	test("rejects other origins", () => {
		expect(isIndexable(new URL("https://preview.vercel.app/play"))).toBe(false);
		expect(isIndexable(new URL("http://localhost:5173/"))).toBe(false);
	});
});

describe("canonicalUrl", () => {
	test("builds an absolute production URL", () => {
		expect(canonicalUrl("/")).toBe("https://twoplay.xyz/");
		expect(canonicalUrl("/play")).toBe("https://twoplay.xyz/play");
	});

	test("drops the query string and fragment", () => {
		expect(canonicalUrl("/play?game=checkers#top")).toBe("https://twoplay.xyz/play");
	});
});

describe("robotsTxt", () => {
	test("allows all agents and names the sitemap", () => {
		const body = robotsTxt();
		expect(body).toContain("User-agent: *");
		expect(body).not.toMatch(/Disallow: \S/);
		expect(body).toContain("Sitemap: https://twoplay.xyz/sitemap.xml");
	});
});

describe("sitemapXml", () => {
	test("lists exactly the indexed pages", () => {
		const body = sitemapXml();
		expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		const locs = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
		expect(locs).toEqual(["https://twoplay.xyz/", "https://twoplay.xyz/play"]);
	});
});

describe("landingJsonLd", () => {
	test("describes the site and the app", () => {
		const data = landingJsonLd();
		expect(data["@context"]).toBe("https://schema.org");
		expect(data["@graph"]).toEqual([
			expect.objectContaining({ "@type": "WebSite", name: "twoplay", url: "https://twoplay.xyz/" }),
			expect.objectContaining({
				"@type": "WebApplication",
				url: "https://twoplay.xyz/",
				applicationCategory: "GameApplication",
				offers: expect.objectContaining({ price: "0" })
			})
		]);
	});
});

describe("serializeJsonLd", () => {
	test("escapes script-closing text and round-trips", () => {
		const data = { name: "</script><script>alert(1)</script>" };
		const json = serializeJsonLd(data);
		expect(json).not.toContain("</script");
		expect(JSON.parse(json)).toEqual(data);
	});
});
