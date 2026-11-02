// Page-load layout shift for each route, at a phone and a desktop viewport, in fresh signed-out contexts.
// Usage: node .agents/scripts/layout-shift.mjs [routes,comma,separated] [--block-clerk]
// Env: BASE (default http://localhost:5173), BUDGET (default 0.01). Exits 1 if any route exceeds BUDGET.
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const BUDGET = Number(process.env.BUDGET ?? 0.01);
const routeArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const routes = routeArg
	? routeArg.split(",")
	: ["/", "/play", "/lobby", "/history", "/leaderboard", "/tictactoe/ABCD", "/checkers/ABCD"];
const blockClerk = process.argv.includes("--block-clerk");

const observer = `window.__shifts = [];
new PerformanceObserver((list) => {
	for (const entry of list.getEntries()) {
		if (entry.hadRecentInput) continue;
		window.__shifts.push({
			value: entry.value,
			sources: entry.sources.map((s) => s.node?.outerHTML.slice(0, 80) ?? "(removed)")
		});
	}
}).observe({ type: "layout-shift", buffered: true });`;

const browser = await chromium.launch({ channel: "chrome" });
let failed = false;
for (const [width, height] of [
	[360, 640],
	[1280, 800]
]) {
	for (const route of routes) {
		const context = await browser.newContext({ viewport: { width, height } });
		if (blockClerk) await context.route("**/npm/@clerk/ui@1/dist/ui.browser.js", (r) => r.abort());
		const page = await context.newPage();
		await page.addInitScript(observer);
		await page.goto(BASE + route, { waitUntil: "load" });
		await page.waitForTimeout(6000);
		const shifts = await page.evaluate(() => window.__shifts);
		const score = shifts.reduce((sum, s) => sum + s.value, 0);
		if (score > BUDGET) failed = true;
		console.log(
			JSON.stringify({ route, viewport: `${width}x${height}`, score: +score.toFixed(4), shifts })
		);
		await context.close();
	}
}
await browser.close();
process.exit(failed ? 1 : 0);
