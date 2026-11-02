// Page-load layout shift for each route, at a phone and a desktop viewport, in fresh signed-out contexts.
// With --hover, also hovers every visible control and fails if any element's box moves or resizes.
// With --overflow, also runs at 360, 575, 768, 1024, and 1280 wide and fails if any visible box pokes
// past a bordered or filled ancestor, if a [data-frame]'s content is off center or within 4px of
// its edge (data-frame="edge" opts out), if sibling frames in a row don't share their top and
// bottom, or if a [data-piece] sits more than 0.5px off its square's center. [data-float] is skipped;
// faded-out boxes are not.
// With --wait=<ms>, waits that long after load instead of 6000 ms (e.g. --wait=45000 for the /about build).
// Usage: node .agents/scripts/layout-shift.mjs [routes,comma,separated] [--block-clerk] [--hover] [--overflow] [--wait=<ms>]
// Env: BASE (default http://localhost:5173), BUDGET (default 0.01). Exits 1 if any route exceeds BUDGET.
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:5173";
const BUDGET = Number(process.env.BUDGET ?? 0.01);
const routeArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const routes = routeArg
	? routeArg.split(",")
	: [
			"/",
			"/play",
			"/lobby",
			"/history",
			"/leaderboard",
			"/learn",
			"/learn/tictactoe",
			"/learn/checkers",
			"/tour",
			"/about",
			"/privacy",
			"/terms",
			"/tictactoe/ABCD",
			"/checkers/ABCD",
			"/settings",
			"/me"
		];
const blockClerk = process.argv.includes("--block-clerk");
const checkHover = process.argv.includes("--hover");
const checkOverflow = process.argv.includes("--overflow");
const waitArg = process.argv.find((arg) => arg.startsWith("--wait="));
const WAIT_MS = waitArg ? Number(waitArg.slice("--wait=".length)) : 6000;
const CONTROLS = "a[href], button, summary, label, [role=tab], [role=button], [role=menuitem]";

// Boxes of the control and its layout neighborhood (the grandparent's subtree), skipping
// aria-hidden decoration, whose demos move on their own.
const neighborhood = (control) => {
	const root = control.parentElement?.parentElement ?? control;
	return [control, ...root.querySelectorAll("*")]
		.filter((el) => !el.closest("[aria-hidden=true]"))
		.map((el) => {
			const r = el.getBoundingClientRect();
			const box = [r.x, r.y, r.width, r.height].map((n) => n.toFixed(1)).join(",");
			return { box, html: el.outerHTML.slice(0, 60) };
		});
};

// Neighbors whose box changes while a control is hovered. Running animations are paused first,
// so only transitions the hover starts can move anything; two idle snapshots catch the rest.
async function hoverMoves(page, control) {
	await control.scrollIntoViewIfNeeded({ timeout: 1000 });
	await page.mouse.move(0, 0);
	await page.waitForTimeout(250);
	await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
	const idleA = await control.evaluate(neighborhood);
	await page.waitForTimeout(250);
	const idleB = await control.evaluate(neighborhood);
	await control.hover({ timeout: 1000 });
	await page.waitForTimeout(300);
	const hovered = await control.evaluate(neighborhood);
	return hovered.filter((el, i) => idleA[i]?.box === idleB[i]?.box && el.box !== idleA[i]?.box);
}

async function hoverShifts(page) {
	// A dev-server update (hot update or reload) re-injects CSS, which swaps fonts, and remounts
	// components, which resets scroll. A control measured within a second of one is measured again.
	let lastUpdate = 0;
	page.on("console", (message) => {
		if (message.text().startsWith("[vite]")) lastUpdate = Date.now();
	});
	page.on("framenavigated", (frame) => {
		if (frame === page.mainFrame()) lastUpdate = Date.now();
	});
	await page.addStyleTag({ content: "*, html { scroll-behavior: auto !important }" });
	const controls = await page.locator(CONTROLS).filter({ visible: true }).all();
	const offenders = [];
	for (const control of controls) {
		for (let attempt = 0; attempt < 3; attempt++) {
			const start = Date.now();
			const moved = await hoverMoves(page, control).catch(() => []);
			if (lastUpdate > start - 1000) continue;
			if (moved.length > 0) {
				offenders.push({
					control: await control.evaluate((el) => el.outerHTML.slice(0, 80)),
					moved: moved.slice(0, 3).map((el) => el.html)
				});
			}
			break;
		}
	}
	return offenders;
}

// Runs in the page with animations paused. Returns boxes that poke past a bordered or filled
// ancestor (clipping ones included, scroll containers excluded), off-center frame content, and
// sibling frames whose tops or bottoms differ. Tolerance is 1px.
function overflowIssues() {
	const TOLERANCE = 1;
	const MIN_GAP = 4;
	// Faded-out boxes count: a pill at opacity 0 still has to fit once it shows.
	const isVisible = (el) =>
		el.checkVisibility({ visibilityProperty: true }) &&
		el.getBoundingClientRect().width > 0 &&
		el.getBoundingClientRect().height > 0;
	const isPainted = (el) => {
		const style = getComputedStyle(el);
		const hasBorder = ["Top", "Right", "Bottom", "Left"].some(
			(side) =>
				parseFloat(style[`border${side}Width`]) > 0 &&
				!/rgba\(.*, 0\)$|transparent/.test(style[`border${side}Color`])
		);
		const hasFill =
			!/rgba\(.*, 0\)$|transparent/.test(style.backgroundColor) || style.backgroundImage !== "none";
		return hasBorder || hasFill;
	};
	const isScroller = (el) => /auto|scroll/.test(getComputedStyle(el).overflow);
	const isClipping = (el) => /hidden|clip/.test(getComputedStyle(el).overflow);
	const isSkipped = (el) =>
		el.closest("[data-float]") !== null || getComputedStyle(el).clip !== "auto";
	const describe = (el) => el.outerHTML.slice(0, 80);
	const past = (inner, outer) =>
		Math.max(
			outer.top - inner.top,
			inner.bottom - outer.bottom,
			outer.left - inner.left,
			inner.right - outer.right
		);

	const overflow = [];
	for (const el of document.body.querySelectorAll("*")) {
		if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
		if (isSkipped(el) || !isVisible(el)) continue;
		const box = el.getBoundingClientRect();
		for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
			if (ancestor === document.body || isScroller(ancestor)) break;
			if (isPainted(ancestor)) {
				const by = past(box, ancestor.getBoundingClientRect());
				// Report only the outermost element that pokes out, not each of its children.
				const parentPokes =
					el.parentElement !== ancestor &&
					past(el.parentElement.getBoundingClientRect(), ancestor.getBoundingClientRect()) >
						TOLERANCE;
				if (by > TOLERANCE && !parentPokes) {
					overflow.push({ el: describe(el), ancestor: describe(ancestor), by: +by.toFixed(1) });
				}
			}
			if (isClipping(ancestor)) break;
		}
	}

	const frames = [...document.querySelectorAll("[data-frame]")].filter(isVisible);
	const offCenter = [];
	for (const frame of frames) {
		if (frame.dataset.frame === "edge") continue;
		const outer = frame.getBoundingClientRect();
		const style = getComputedStyle(frame);
		const inner = {
			top: outer.top + parseFloat(style.borderTopWidth),
			bottom: outer.bottom - parseFloat(style.borderBottomWidth),
			left: outer.left + parseFloat(style.borderLeftWidth),
			right: outer.right - parseFloat(style.borderRightWidth)
		};
		// The content group: every box inside, minus full-size layers and floating decoration.
		const boxes = [...frame.querySelectorAll("*")]
			.filter((el) => !isSkipped(el) && isVisible(el))
			.map((el) => el.getBoundingClientRect())
			.filter(
				(r) =>
					r.width < inner.right - inner.left - TOLERANCE ||
					r.height < inner.bottom - inner.top - TOLERANCE
			);
		if (boxes.length === 0) continue;
		const top = Math.min(...boxes.map((r) => r.top)) - inner.top;
		const bottom = inner.bottom - Math.max(...boxes.map((r) => r.bottom));
		const left = Math.min(...boxes.map((r) => r.left)) - inner.left;
		const right = inner.right - Math.max(...boxes.map((r) => r.right));
		const isTouching = Math.min(top, right, bottom, left) < MIN_GAP;
		if (isTouching || Math.abs(top - bottom) > TOLERANCE || Math.abs(left - right) > TOLERANCE) {
			offCenter.push({
				frame: describe(frame),
				gaps: [top, right, bottom, left].map((n) => +n.toFixed(1))
			});
		}
	}

	const misaligned = [];
	for (const frame of frames) {
		const box = frame.getBoundingClientRect();
		const row = frames.filter((other) => {
			const r = other.getBoundingClientRect();
			return other !== frame && r.top < box.bottom && r.bottom > box.top && r.left > box.left;
		});
		for (const other of row) {
			const r = other.getBoundingClientRect();
			if (Math.abs(r.top - box.top) > TOLERANCE || Math.abs(r.bottom - box.bottom) > TOLERANCE) {
				misaligned.push({ a: describe(frame), b: describe(other) });
			}
		}
	}

	// Each board piece's center against its square's, within half a pixel.
	const offSquare = [];
	for (const piece of document.querySelectorAll("[data-piece]")) {
		const board = piece.parentElement.parentElement;
		const square = board.querySelector(`[data-slot-index="${piece.dataset.piece}"]`);
		// A piece caught mid-glide is checked once it lands, on another run.
		if (!square || !isVisible(piece) || piece.getAnimations().length > 0) continue;
		const a = piece.getBoundingClientRect();
		const b = square.getBoundingClientRect();
		const by = Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2);
		if (by > 0.5) offSquare.push({ piece: piece.dataset.piece, by: +by.toFixed(2) });
	}

	return { overflow, offCenter, misaligned, offSquare };
}

async function overflowCheck(page) {
	await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
	const issues = await page.evaluate(overflowIssues);
	return Object.values(issues).some((list) => list.length > 0) ? issues : undefined;
}

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

let browser = await chromium.launch({ channel: "chrome" });
let failed = false;
const viewports = checkOverflow
	? [
			[360, 640],
			[575, 800],
			[768, 900],
			[1024, 768],
			[1280, 800]
		]
	: [
			[360, 640],
			[1280, 800]
		];
async function measure(route, width, height) {
	if (!browser.isConnected()) browser = await chromium.launch({ channel: "chrome" });
	const context = await browser.newContext({ viewport: { width, height } });
	try {
		if (blockClerk) await context.route("**/npm/@clerk/ui@1/dist/ui.browser.js", (r) => r.abort());
		const page = await context.newPage();
		await page.addInitScript(observer);
		await page.goto(BASE + route, { waitUntil: "load" });
		await page.waitForTimeout(WAIT_MS);
		const shifts = await page.evaluate(() => window.__shifts);
		const score = shifts.reduce((sum, s) => sum + s.value, 0);
		const overflow = checkOverflow ? await overflowCheck(page) : undefined;
		const hover = checkHover ? await hoverShifts(page) : undefined;
		return { route, viewport: `${width}x${height}`, score: +score.toFixed(4), shifts, overflow, hover };
	} finally {
		await context.close();
	}
}

for (const [width, height] of viewports) {
	for (const route of routes) {
		// A dev-server reload mid-run destroys or hangs the page; measure that route again, up to twice.
		const attempt = () =>
			Promise.race([
				measure(route, width, height),
				new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), 120_000 + WAIT_MS))
			]);
		const result = await attempt().catch(attempt).catch(attempt);
		if (result.score > BUDGET || result.overflow || result.hover?.length) failed = true;
		console.log(JSON.stringify(result));
	}
}
await browser.close();
process.exit(failed ? 1 : 0);
