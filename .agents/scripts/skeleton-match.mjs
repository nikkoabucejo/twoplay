// Checks that each loading skeleton takes the exact box of the UI that replaces it. Loads every
// route twice in a signed-in copy of a .browser-profiles profile: once with the Convex websocket
// held (queries never resolve, so the skeleton stays), once live. Pairs [data-loading="x"] in the
// held page with [data-loaded="x"] in the live page and reports:
//   region  the two roots' boxes differ in position or width
//   length  (note, not a failure) only the height differs: the list has more or fewer rows
//   leaves  a skeleton leaf's top or height differs from the loaded leaf on its row, or a loaded
//           leaf has no skeleton leaf on its row (missing placeholder)
//   around  an element outside both regions moved between the two pages
// Writes <route>-<viewport>-{loading,loaded,overlay}.png to OUT; overlay is the loaded page with the
// skeleton at 50% on top, so any misfit shows as a double edge.
// Usage: node .agents/scripts/skeleton-match.mjs /history,/leaderboard,/play [--signed-out]
// Env: BASE (http://localhost:5173), PROFILE (player-d), OUT (os tmpdir/skeleton-match),
//      VIEWPORTS (360x740,1280x800). Exits 1 on any mismatch or a route with no pair.
import { chromium } from "playwright-core";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:5173";
const PROFILE = process.env.PROFILE ?? "player-d";
const OUT = process.env.OUT ?? join(tmpdir(), "skeleton-match");
const VIEWPORTS = (process.env.VIEWPORTS ?? "360x740,1280x800")
	.split(",")
	.map((size) => size.split("x").map(Number));
const routeArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!routeArg) {
	console.error("Usage: node .agents/scripts/skeleton-match.mjs /route[,/route…] [--signed-out]");
	process.exit(2);
}
const routes = routeArg.split(",");
const signedOut = process.argv.includes("--signed-out");
const TOLERANCE = 1;

// Runs in the page. Boxes relative to the viewport: the region root, its visible leaves, and every
// visible element outside any region, keyed by a path that ignores the region's own subtree.
function snapshot(attribute) {
	const isVisible = (el) => {
		const r = el.getBoundingClientRect();
		return (
			r.width > 0 &&
			r.height > 0 &&
			el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) &&
			!el.closest(".sr-only") &&
			!el.closest("[aria-hidden=true]:not([data-loading] *, [data-loading])")
		);
	};
	const box = (el) => {
		const r = el.getBoundingClientRect();
		return { x: r.x, y: r.y, w: r.width, h: r.height };
	};
	const describe = (el) => el.outerHTML.slice(0, 90).replace(/\s+/g, " ");
	const regions = [...document.querySelectorAll(`[${attribute}]`)].filter(isVisible);
	const inRegion = (el) => el.closest("[data-loading], [data-loaded]") !== null;

	// A badge or chip with its own fill or border shows its whole box.
	const isPainted = (el) => {
		const style = getComputedStyle(el);
		const clear = /rgba\(.*, 0\)$|transparent/;
		return (
			(!clear.test(style.backgroundColor) || style.backgroundImage !== "none" || parseFloat(style.borderTopWidth) > 0) &&
			el.tagName !== "TD" && el.tagName !== "TR" && el.tagName !== "LI"
		);
	};
	// A control (Button, input) is one box, and so is a painted text box. Other text is its line box: the text's vertical center, one
	// line-height tall per line, so a padded cell compares like the line inside it.
	const ATOMIC = "[data-slot=button], input, select, textarea";
	const textBox = (el) => {
		const rects = [...el.childNodes]
			.filter((n) => n.nodeType === 3 && n.textContent.trim())
			.flatMap((n) => {
				const range = document.createRange();
				range.selectNodeContents(n);
				return [...range.getClientRects()];
			});
		const top = Math.min(...rects.map((r) => r.top));
		const bottom = Math.max(...rects.map((r) => r.bottom));
		const left = Math.min(...rects.map((r) => r.left));
		const right = Math.max(...rects.map((r) => r.right));
		const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || bottom - top;
		const lines = new Set(rects.map((r) => Math.round(r.top))).size;
		const h = lineHeight * lines;
		return { x: left, y: (top + bottom) / 2 - h / 2, w: right - left, h };
	};
	// Pinned rows (sticky, fixed) float over the list, so a skeleton doesn't mirror them.
	const isPinned = (el, root) => {
		for (let node = el; node && node !== root; node = node.parentElement) {
			if (/sticky|fixed/.test(getComputedStyle(node).position)) return true;
		}
		return false;
	};
	const leavesOf = (root) =>
		[...root.querySelectorAll("*")]
			.filter((el) => !(el instanceof SVGElement) || el instanceof SVGSVGElement)
			.filter((el) => !el.parentElement.closest("svg") && !el.parentElement.closest(ATOMIC))
			.filter((el) => isVisible(el) && !isPinned(el, root))
			.flatMap((el) => {
				if (el.matches(ATOMIC) || el instanceof SVGSVGElement || isPainted(el)) {
					return [{ ...box(el), html: describe(el) }];
				}
				const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
				if (hasText) return [{ ...textBox(el), html: describe(el) }];
				return [...el.children].some(isVisible) ? [] : [{ ...box(el), html: describe(el) }];
			});

	const path = (el) => {
		const parts = [];
		for (let node = el; node && node !== document.body; node = node.parentElement) {
			const siblings = [...node.parentElement.children].filter((s) => !inRegion(s) || s === node);
			parts.unshift(`${node.tagName}:${siblings.indexOf(node)}`);
		}
		return parts.join("/");
	};
	// Ambient motion (the mood backdrop, pulses) moves on its own, so it never counts as a shift.
	const animated = new Set(document.getAnimations().map((a) => a.effect?.target));
	const isAnimated = (el) => {
		for (let node = el; node; node = node.parentElement) {
			if (animated.has(node)) return true;
		}
		return false;
	};
	const around = [...document.body.querySelectorAll("*")]
		.filter((el) => !inRegion(el) && !el.querySelector("[data-loading], [data-loaded]"))
		.filter((el) => !(el instanceof SVGElement) && isVisible(el))
		.filter((el) => !el.closest("[aria-hidden=true], [data-float]") && !isAnimated(el))
		.map((el) => ({ key: path(el), ...box(el), html: describe(el) }));

	return {
		regions: regions.map((el) => ({
			name: el.getAttribute(attribute),
			...box(el),
			leaves: leavesOf(el)
		})),
		around
	};
}

const off = (a, b) => Math.abs(a - b) > TOLERANCE;
const round = (b) => [b.x, b.y, b.w, b.h].map((n) => +n.toFixed(1)).join(",");

function compare(loading, loaded) {
	const issues = [];
	if (off(loading.x, loaded.x) || off(loading.y, loaded.y) || off(loading.w, loaded.w)) {
		issues.push({ kind: "region", loading: round(loading), loaded: round(loaded) });
	} else if (off(loading.h, loaded.h)) {
		// Only the height differs: a list with more or fewer rows than the skeleton. Not a misfit by
		// itself; `around` reports anything it pushed, and rows are checked below.
		issues.push({ kind: "length", note: true, loading: round(loading), loaded: round(loaded) });
	}
	// Rows: a loaded leaf matches the skeleton leaf that overlaps it horizontally with the
	// closest top; text bars may differ in width, so only top and height must agree. Rows past
	// the shorter of the two lists aren't compared.
	const overlapX = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0;
	const near = (a, b) => Math.abs(a.y - b.y) + Math.abs(a.y + a.h - (b.y + b.h));
	const dx = loaded.x - loading.x;
	const dy = loaded.y - loading.y;
	const skeletonBottom = Math.max(...loading.leaves.map((bar) => bar.y + bar.h));
	const bottom = Math.min(loading.y + loading.h, loaded.y + loaded.h - dy, skeletonBottom);
	for (const real of loaded.leaves) {
		const shifted = { ...real, x: real.x - dx, y: real.y - dy };
		if (shifted.y + shifted.h > bottom) continue;
		const candidates = loading.leaves.filter(
			(bar) => overlapX(bar, shifted) && bar.y < shifted.y + shifted.h && bar.y + bar.h > shifted.y
		);
		if (candidates.length === 0) {
			issues.push({ kind: "leaves", missing: real.html, at: round(shifted) });
			continue;
		}
		const bar = candidates.reduce((a, b) => (near(a, shifted) <= near(b, shifted) ? a : b));
		// Smaller inline text (a "YOU" tag on a name) sits centered in the larger line's bar.
		const inside = bar.y <= shifted.y + TOLERANCE && bar.y + bar.h >= shifted.y + shifted.h - TOLERANCE;
		const centered = !off(bar.y + bar.h / 2, shifted.y + shifted.h / 2);
		if ((off(bar.y, shifted.y) || off(bar.h, shifted.h)) && !(inside && centered)) {
			issues.push({ kind: "leaves", loaded: real.html, at: round(shifted), skeleton: bar.html, bar: round(bar) });
		}
	}
	return issues;
}

function moved(loadingAround, loadedAround) {
	const byKey = new Map(loadingAround.map((el) => [el.key, el]));
	return loadedAround
		.filter((el) => byKey.has(el.key))
		.filter((el) => {
			const before = byKey.get(el.key);
			return off(el.x, before.x) || off(el.y, before.y) || off(el.w, before.w) || off(el.h, before.h);
		})
		.map((el) => ({ kind: "around", el: el.html, loading: round(byKey.get(el.key)), loaded: round(el) }));
}

async function overlay(browser, under, over, file) {
	const page = await browser.newPage();
	await page.setContent("<canvas></canvas>");
	const png = await page.evaluate(
		async ([a, b]) => {
			const load = (src) =>
				new Promise((resolve) => {
					const img = new Image();
					img.onload = () => resolve(img);
					img.src = `data:image/png;base64,${src}`;
				});
			const [bottom, top] = await Promise.all([load(a), load(b)]);
			const canvas = document.querySelector("canvas");
			canvas.width = bottom.width;
			canvas.height = bottom.height;
			const ctx = canvas.getContext("2d");
			ctx.drawImage(bottom, 0, 0);
			ctx.globalAlpha = 0.5;
			ctx.drawImage(top, 0, 0);
			return canvas.toDataURL("image/png").split(",")[1];
		},
		[under.toString("base64"), over.toString("base64")]
	);
	writeFileSync(file, Buffer.from(png, "base64"));
	await page.close();
}

async function capture(context, route, attribute, holdSocket) {
	const page = await context.newPage();
	try {
		// Never connecting to the server leaves every query loading.
		if (holdSocket) await page.routeWebSocket(/convex\.cloud/, () => {});
		await page.goto(BASE + route, { waitUntil: "load", timeout: 120_000 });
		await page
			.locator(`[${attribute}]`)
			.first()
			.waitFor({ state: "visible", timeout: 60_000 })
			.catch(() => {});
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(holdSocket ? 1500 : 3000);
		await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
		const result = await page.evaluate(snapshot, attribute);
		const png = await page.screenshot();
		return { ...result, png };
	} finally {
		await page.close();
	}
}

mkdirSync(OUT, { recursive: true });
// A copy, so the profile can stay open in its MCP browser.
const userDataDir = mkdtempSync(join(tmpdir(), "skeleton-profile-"));
if (!signedOut) {
	cpSync(`.browser-profiles/${PROFILE}`, userDataDir, {
		recursive: true,
		filter: (src) => !/Singleton|lockfile|Cache|Code Cache|GPUCache/.test(src)
	});
}
let failed = false;
try {
	for (const [width, height] of VIEWPORTS) {
		const context = await chromium.launchPersistentContext(userDataDir, {
			channel: "chrome",
			viewport: { width, height }
		});
		try {
			for (const route of routes) {
				// A dev-server reload mid-capture destroys the page; capture that state again, up to twice.
				const retry = (attribute, holdSocket) => {
					const attempt = () => capture(context, route, attribute, holdSocket);
					return attempt().catch(attempt).catch(attempt);
				};
				const held = await retry("data-loading", true);
				const live = await retry("data-loaded", false);
				const viewport = `${width}x${height}`;
				const pairs = held.regions.map((loading) => ({
					loading,
					loaded: live.regions.find((r) => r.name === loading.name)
				}));
				const stem = join(OUT, `${route.replace(/\W+/g, "_")}-${viewport}`);
				writeFileSync(`${stem}-loading.png`, held.png);
				writeFileSync(`${stem}-loaded.png`, live.png);
				await overlay(context, live.png, held.png, `${stem}-overlay.png`);
				const issues = [];
				for (const { loading, loaded } of pairs) {
					if (!loaded) {
						issues.push({ kind: "unpaired", name: loading.name, hint: `no [data-loaded] after loading: empty or error state, or the account has no data; see ${stem}-loaded.png` });
						continue;
					}
					issues.push(...compare(loading, loaded).map((issue) => ({ name: loading.name, ...issue })));
				}
				if (pairs.length === 0) {
					issues.push({ kind: "unpaired", hint: `no [data-loading] while queries were held; see ${stem}-loading.png` });
				}
				issues.push(...moved(held.around, live.around).slice(0, 8));
				if (issues.some((issue) => !issue.note)) failed = true;
				console.log(JSON.stringify({ route, viewport, regions: pairs.map((p) => p.loading.name), ok: !issues.some((issue) => !issue.note), issues: issues.slice(0, 20) }));
			}
		} finally {
			await context.close();
		}
	}
} finally {
	rmSync(userDataDir, { recursive: true, force: true });
}
console.log(`screenshots: ${OUT}`);
process.exit(failed ? 1 : 0);
