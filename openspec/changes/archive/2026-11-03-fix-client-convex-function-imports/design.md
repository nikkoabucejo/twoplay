# Design

## Context

Convex's function builders warn when they run with `window` defined. Two client value imports trigger them:

- `DEFAULT_EMOJI` from `convex/models/players/index.ts` (defines `trashtalk`, `heartbeat`; imports `rooms/auth.ts`, which imports `users/index.ts`). Imported by `src/lib/components/ui/playing/playing.svelte` and `src/lib/features/play/{checkers,tictactoe,chess}/*.svelte`.
- `DEFAULT_TIME_CONTROL_MS` from `convex/models/rooms/index.ts` (12 functions, imports `games/index.ts`, `clocks`, `pairings/queue`, `players`, `results`). Imported by `src/lib/features/core/play/play.svelte`.

Already clean: `history/rounds.ts`, `stats/stats.ts`, `history.svelte`, `room.svelte.ts` (type-only), and `games/<game>/{index,rules,engine,schema}.ts`, `games/engine.ts` (no functions). `games/index.ts` defines `resign`, `timeout`, `history`, but `src/` imports it type-only.

`.svelte-kit/tsconfig.json` sets `verbatimModuleSyntax: true`, so `import { type A } from "x"` compiles to `import "x"` and still loads the module. Only `import type` / `export type` are erased.

## Goals / Non-Goals

**Goals:** zero Convex import warnings in the browser; a test that keeps it that way.

**Non-Goals:** splitting `games/index.ts`; moving `generateRoomCode` (needs `MutationCtx`); renaming or changing any exported value.

## Decisions

### 1. Function-free `constants.ts` per model

New `convex/models/players/constants.ts` holds `DEFAULT_EMOJI`, `TRASHTALK_EMOJIS`. New `convex/models/rooms/constants.ts` holds `DEFAULT_TIME_CONTROL_MS`, `MIN_TIME_CONTROL_MS`, `MAX_TIME_CONTROL_MS` (unexported), and `resolveTimeControlMs`. Neither imports anything. Server and client import from these files directly; `index.ts` does not re-export them, so there is one import path per symbol.

Alternative: re-export from `index.ts` for server callers and import `constants.ts` only on the client. Rejected: two paths for one value, and the guard would still have to know which path is safe.

Alternative: duplicate the constants under `src/lib`. Rejected: `TRASHTALK_EMOJIS` is the server allowlist and must have one source.

### 2. Guard test: allowlist of client-importable paths, plus a function-free check

`convex/client-boundary.test.ts` (convex Vitest project; it sits beside the modules it guards, and `src/lib` holds only category folders). It reads files at run time with `node:fs` `globSync` and `readFileSync`, like the chess.js boundary test in `convex/models/games/chess/rules.test.ts`.

1. Scan `src/**/*.{ts,svelte}`, excluding `**/*.test.ts`.
2. Parse each `import … from`, `export … from`, bare `import "…"`, and `import("…")` whose specifier resolves under `convex/`. Skip statements that start `import type` / `export type`. Treat every other form as a value import, including `import { type A }` (see `verbatimModuleSyntax` above) and mixed `import { x, type Y }`.
3. Resolve each specifier to a repo path and require it to match the allowlist: `convex/_generated/api.js`, `convex/models/*/constants.js`, `convex/models/games/<game>/{index,rules}.js`.
4. For each allowlisted target that exists as a `.ts` file, walk its relative value imports inside `convex/` and fail if any reached file calls `query(`, `mutation(`, `action(`, `internalQuery(`, `internalMutation(`, `internalAction(`, or `httpAction(`.

The failure lists `<src file> -> <convex path>` so the fix is obvious.

Alternative: denylist (scan each imported module for function builders only, no allowlist). Simpler, but any new module is allowed by default. The allowlist makes adding a client-importable path a reviewed edit, and step 4 still catches an allowlisted file that later gains a function.

Alternative: a Vite plugin or ESLint rule. Rejected: new tooling for one rule; the repo already uses run-time file-scan tests.

The uncommitted `src/lib/features/core/sandbox/fixtures.ts` and `interactions.svelte` value-import `games/<game>/{index,rules}.js`, which the allowlist accepts, so the test passes with or without them.

### 3. Generated module listing

`convex/_generated/api.d.ts` lists every module under `convex/`. Adding two files adds two `typeof` module entries. Regenerate with `pnpm exec convex codegen`; if that needs a deployment, add the two entries by hand in the existing sorted order. No function references change.

### Caller impact

| Caller                                                                                        | Action                                                                                               |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `players/index.ts` `ensurePlayer`, `trashtalk`                                                | import from `./constants.js`                                                                         |
| `players/index.test.ts`                                                                       | import `DEFAULT_EMOJI` from `./constants.js`                                                         |
| `rooms/index.ts` `create`, `join`, `get`, `rematch`, `lobbies` (lines 89, 142, 183, 349, 693) | import from `./constants.js`                                                                         |
| `pairings/index.ts` `enqueue`                                                                 | `resolveTimeControlMs` from `../rooms/constants.js`; `generateRoomCode` stays on `../rooms/index.js` |
| `playing.svelte`, `checkers.svelte`, `tictactoe.svelte`, `chess.svelte`, `play.svelte`        | import from the new `constants.js`                                                                   |
| `ui/playing/index.ts`                                                                         | unaffected: re-exports the component and its props type only                                         |
| `play.svelte.test.ts`                                                                         | unaffected: does not import the moved symbol; asserts on literal values                              |
| `rooms/schema.ts` comment naming `DEFAULT_TIME_CONTROL_MS`                                    | unaffected: the name is unchanged                                                                    |
| `.agents/skills/twoplay/references/backend.md` trust-boundary line citing `players/index.ts`  | point at `players/constants.ts`                                                                      |

## Trust boundary

No change. `trashtalk` still authenticates through `requirePlayer` (via `ctx.auth`), checks room activity and that the seat has not left, then checks `TRASHTALK_EMOJIS.includes(emoji)`. `create` and `enqueue` still authenticate with `requireUser` and clamp the client-sent `timeControlMs` with `resolveTimeControlMs`. The lists and bounds move file but keep their values; existing tests (`players/index.test.ts` "Unknown emoji", `rooms/index.test.ts` clamp cases, `pairings/index.test.ts` clamp cases) cover them. Exposing the allowlist to the client bundle reveals nothing new: the picker already ships the same codepoints.

## Risks / Trade-offs

- [Regex parsing misses an import form] → the test covers the forms used in `src/` (static, re-export, bare, dynamic, multi-line specifier lists); a missed form fails open, which the live console check backs up.
- [Merge conflict in `rooms/index.ts`, `chess.svelte`, `checkers.svelte`] → apply after `fix-resign-clock-deduction` and `fix-board-selection-labels`; the edits here are import lines and one constants block.
- [Allowlist goes stale when a new function-free module is needed on the client] → extend the allowlist in the same change; the test message says so.

## Convention

New convention: client code value-imports only function-free Convex modules (`constants.ts`, `rules.ts`, `engine.ts`, `schema.ts`, game `index.ts`, `_generated/api`). Recorded in `backend.md` and `decisions.md`, enforced by the guard test.
