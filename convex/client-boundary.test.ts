// @vitest-environment node
import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/** Convex modules that browser code may value-import. Add a path here only if it registers no function. */
const CLIENT_IMPORTABLE =
	/^convex\/(?:_generated\/api\.js|models\/[^/]+\/constants\.js|models\/games\/[^/]+\/(?:index|rules)\.js)$/;

const FUNCTION_BUILDER =
	/(?<![\w.$])(?:query|mutation|action|internalQuery|internalMutation|internalAction|httpAction)\s*\(/;

const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

/** Relative specifiers a source loads at run time. With `verbatimModuleSyntax`, only `import type`
 *  and `export type` are erased; `import { type A }` still loads the module. */
function valueImports(source: string): string[] {
	const forms = [
		/\b(?:import|export)\s+(type\s+)?[\w$*{},\s]+?\s+from\s*["']([^"']+)["']/g,
		/\bimport\s*()["']([^"']+)["']/g,
		/\bimport\s*\(\s*()["']([^"']+)["']\s*\)/g
	];
	const code = source.replace(COMMENT, "");
	return forms.flatMap((form) =>
		[...code.matchAll(form)]
			.filter(([, typeOnly, specifier]) => !typeOnly && specifier.startsWith("."))
			.map(([, , specifier]) => specifier)
	);
}

/** Repo-relative paths under `convex/` that `file` value-imports. */
function convexImports(file: string): string[] {
	return valueImports(readFileSync(join(ROOT, file), "utf8"))
		.map((specifier) => relative(ROOT, join(ROOT, dirname(file), specifier)))
		.filter((path) => path.startsWith("convex/"));
}

/** The first module reachable from `entry` through value imports that registers a Convex function. */
function reachedFunctionModule(entry: string): string | undefined {
	const seen = new Set<string>();
	const pending = [entry];
	for (let path = pending.pop(); path !== undefined; path = pending.pop()) {
		const file = existsSync(join(ROOT, path)) ? path : path.replace(/(?:\.js)?$/, ".ts");
		if (seen.has(file) || !existsSync(join(ROOT, file))) continue;
		seen.add(file);
		const code = readFileSync(join(ROOT, file), "utf8").replace(COMMENT, "");
		if (FUNCTION_BUILDER.test(code)) return file;
		pending.push(...convexImports(file));
	}
	return undefined;
}

describe("client imports of Convex modules", () => {
	// Read at run time: a Vite glob is fixed when the test file is transformed, and the transform is cached.
	const clientImports = globSync("src/**/*.{ts,svelte}", {
		cwd: ROOT,
		exclude: ["**/*.test.ts"]
	}).flatMap((file) => convexImports(file).map((path) => ({ file, path })));

	test("browser code value-imports only allowlisted Convex modules", () => {
		const offenders = clientImports
			.filter(({ path }) => !CLIENT_IMPORTABLE.test(path))
			.map(({ file, path }) => `${file} -> ${path}`);
		expect(offenders).toEqual([]);
	});

	test("allowlisted modules reach no Convex function", () => {
		const targets = new Set(
			clientImports.map(({ path }) => path).filter((path) => CLIENT_IMPORTABLE.test(path))
		);
		const offenders = [...targets].flatMap((path) => {
			const reached = reachedFunctionModule(path);
			return reached ? [`${path} -> ${reached}`] : [];
		});
		expect(offenders).toEqual([]);
	});
});

describe("reachedFunctionModule", () => {
	test("follows imports to a function module, ignoring comments and ctx.db.query", () => {
		expect(reachedFunctionModule("convex/models/rooms/auth.js")).toMatch(
			/^convex\/models\/(?:players|users)\/index\.ts$/
		);
	});

	test("a game module reaches no function", () => {
		expect(reachedFunctionModule("convex/models/games/chess/index.js")).toBeUndefined();
	});
});

describe("valueImports", () => {
	test("a mixed value and type import loads the module", () => {
		const source = `import { x, type Y } from "../../convex/models/rooms/index.js";`;
		expect(valueImports(source)).toEqual(["../../convex/models/rooms/index.js"]);
	});

	test("an inline type-only specifier list still loads the module", () => {
		const source = `import {\n\ttype A,\n\ttype B\n} from "../convex/models/rooms/index.js";`;
		expect(valueImports(source)).toEqual(["../convex/models/rooms/index.js"]);
	});

	test("a dynamic import loads the module", () => {
		const source = `const players = await import("../../convex/models/players/index.js");`;
		expect(valueImports(source)).toEqual(["../../convex/models/players/index.js"]);
	});

	test("a bare import and a re-export load the module", () => {
		const source = `import "./setup.js";\nexport { chessEngine } from "./engine.js";`;
		expect(valueImports(source).sort()).toEqual(["./engine.js", "./setup.js"]);
	});

	test("import type and export type are erased", () => {
		const source = [
			`import type { Y } from "../../convex/models/rooms/index.js";`,
			`export type { Z } from "../../convex/models/rooms/index.js";`
		].join("\n");
		expect(valueImports(source)).toEqual([]);
	});

	test("a commented specifier list loads the module", () => {
		const source = `import {\n\ta, // note\n\tb\n} from "../convex/models/rooms/index.js";`;
		expect(valueImports(source)).toEqual(["../convex/models/rooms/index.js"]);
	});

	test("a type alias before a value import does not hide it", () => {
		const source = `export type Seat = { name: string };\nimport { x } from "./x.js";`;
		expect(valueImports(source)).toEqual(["./x.js"]);
	});
});
