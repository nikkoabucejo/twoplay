import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { SEAT_COLORS } from "./index.js";

// The favicon is loaded standalone, outside the stylesheet, so it can't read the tokens.
const TOKEN_FILES = new Set([
	"src/routes/layout.css",
	"src/lib/utils/style/seats/index.ts",
	"src/lib/assets/favicon.svg"
]);
const STRAY_SEAT_LITERAL = /#06b6d4|#ec4899|cyan-500|pink-500/i;
// Only real sources, so editor backups or files mid-write never make the scan flaky.
const SOURCE_FILE = /\.(svelte|ts|js|css|html|svg)$/;

describe("SEAT_COLORS", () => {
	test("matches the seat tokens in the stylesheet, in seat order", () => {
		const css = readFileSync("src/routes/layout.css", "utf8");
		const tokens = [...css.matchAll(/--seat-(\d):\s*(#[0-9a-f]{6})/g)]
			.sort((a, b) => Number(a[1]) - Number(b[1]))
			.map((match) => match[2]);
		expect(tokens).toEqual(SEAT_COLORS);
	});

	test("no source file outside the token definitions repeats a seat color", () => {
		const offenders = readdirSync("src", { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && SOURCE_FILE.test(entry.name))
			.map((entry) => join(entry.parentPath, entry.name))
			.filter((path) => !path.endsWith(".test.ts") && !TOKEN_FILES.has(path))
			.filter((path) => STRAY_SEAT_LITERAL.test(readFileSync(path, "utf8")));
		expect(offenders).toEqual([]);
	});
});
