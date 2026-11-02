import { render } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import { Meta } from "./index.js";

const page = vi.hoisted(() => ({ url: new URL("https://twoplay.xyz/") }));

vi.mock("$app/state", () => ({ page }));

function content(selector: string) {
	return document.head.querySelector(selector)?.getAttribute("content");
}

function renderAt(href: string, props: Record<string, unknown> = {}) {
	page.url = new URL(href);
	render(Meta, { props: { title: "Play", description: "Find a match.", ...props } });
}

describe("Meta", () => {
	test("titles the page with the app name", () => {
		render(Meta, { props: { title: "Leaderboard", description: "Top players." } });
		expect(document.title).toBe("Leaderboard · twoplay");
	});

	test("uses the app name alone without a title", () => {
		render(Meta, { props: { description: "Real-time two-player games." } });
		expect(document.title).toBe("twoplay");
	});

	test("adds the description and Open Graph tags", () => {
		render(Meta, { props: { title: "Leaderboard", description: "Top players." } });
		expect(content('meta[name="description"]')).toBe("Top players.");
		expect(content('meta[property="og:title"]')).toBe("Leaderboard · twoplay");
		expect(content('meta[property="og:description"]')).toBe("Top players.");
		expect(content('meta[property="og:type"]')).toBe("website");
		expect(content('meta[property="og:site_name"]')).toBe("twoplay");
		expect(content('meta[property="og:locale"]')).toBe("en_US");
	});

	test("uses the production image on any origin", () => {
		renderAt("https://preview.vercel.app/play");
		expect(content('meta[property="og:image"]')).toBe("https://twoplay.xyz/og.png");
		expect(content('meta[property="og:image:width"]')).toBe("1200");
		expect(content('meta[property="og:image:height"]')).toBe("630");
		expect(content('meta[property="og:image:alt"]')).toBeTruthy();
	});

	test("adds a large Twitter card", () => {
		renderAt("https://twoplay.xyz/play");
		expect(content('meta[name="twitter:card"]')).toBe("summary_large_image");
		expect(content('meta[name="twitter:title"]')).toBe("Play · twoplay");
		expect(content('meta[name="twitter:description"]')).toBe("Find a match.");
		expect(content('meta[name="twitter:image"]')).toBe(content('meta[property="og:image"]'));
	});

	test("adds a canonical URL without the query string on indexed pages", () => {
		renderAt("https://twoplay.xyz/play?game=checkers");
		const canonical = document.head.querySelector('link[rel="canonical"]');
		expect(canonical?.getAttribute("href")).toBe("https://twoplay.xyz/play");
		expect(content('meta[property="og:url"]')).toBe("https://twoplay.xyz/play");
		expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
	});

	test("canonicalizes the landing page", () => {
		renderAt("https://twoplay.xyz/");
		const canonical = document.head.querySelector('link[rel="canonical"]');
		expect(canonical?.getAttribute("href")).toBe("https://twoplay.xyz/");
	});

	test.each(["/tictactoe/ABCD", "/history", "/lobby", "/leaderboard"])(
		"marks %s noindex without a canonical URL",
		(path) => {
			renderAt(`https://twoplay.xyz${path}`);
			expect(content('meta[name="robots"]')).toContain("noindex");
			expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
			expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
		}
	);

	test("marks indexed paths noindex on other origins", () => {
		renderAt("https://preview.vercel.app/play");
		expect(content('meta[name="robots"]')).toContain("noindex");
		expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
	});

	test("renders escaped JSON-LD", () => {
		const jsonLd = { "@context": "https://schema.org", name: "</script>" };
		renderAt("https://twoplay.xyz/", { jsonLd });
		const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
		expect(scripts).toHaveLength(1);
		expect(scripts[0].innerHTML).not.toContain("</script");
		expect(JSON.parse(scripts[0].innerHTML)).toEqual(jsonLd);
	});

	test("omits JSON-LD by default", () => {
		renderAt("https://twoplay.xyz/");
		expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
	});
});
