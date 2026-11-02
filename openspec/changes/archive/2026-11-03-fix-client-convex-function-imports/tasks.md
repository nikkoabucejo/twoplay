# Tasks

Apply after `fix-resign-clock-deduction` and `fix-board-selection-labels`.

## 1. Guard test

- [x] 1.1 [engineer] Create `convex/client-boundary.test.ts` per design §2: `globSync` over `src/**/*.{ts,svelte}` excluding `**/*.test.ts`; parse static, re-export, bare, and dynamic imports resolving under `convex/`; skip `import type` / `export type`; count `import { type A }` and mixed `import { x, type Y }` as value imports; require the allowlist (`_generated/api.js`, `models/*/constants.js`, `models/games/<game>/{index,rules}.js`); walk each allowlisted target's relative value imports and fail on any `query(`/`mutation(`/`action(`/`internalQuery(`/`internalMutation(`/`internalAction(`/`httpAction(` call. Report failures as `<src file> -> <convex path>`. Verify with `pnpm test` that it fails and lists exactly the five offenders (`playing.svelte`, `checkers.svelte`, `tictactoe.svelte`, `chess.svelte`, `play.svelte`), and does not list `sandbox/fixtures.ts`, `sandbox/interactions.svelte`, `history/rounds.ts`, `stats/stats.ts`, `room.svelte.ts`.
- [x] 1.2 [engineer] In the same file, add cases that feed the parser fixed source strings: `import { x, type Y } from ".../convex/models/rooms/index.js"` and `import("…/convex/models/players/index.js")` are flagged; `import type { Y } from ".../convex/models/rooms/index.js"` is not. Verify with `pnpm test`.

## 2. Server constants

- [x] 2.1 [engineer] Create `convex/models/rooms/constants.test.ts`: `resolveTimeControlMs(undefined)` and `(NaN)` return `5 * 60_000`; `(1_000)` returns `10_000`; `(2 * 60 * 60_000)` returns `60 * 60_000`; `(90_000)` returns `90_000`. Create `convex/models/players/constants.test.ts`: `TRASHTALK_EMOJIS` contains `DEFAULT_EMOJI` and equals the current 11 codepoints. Verify they fail (modules missing) with `pnpm test`.
- [x] 2.2 [engineer] Create `convex/models/players/constants.ts` with `DEFAULT_EMOJI` and `TRASHTALK_EMOJIS` (move the doc comment); remove both from `convex/models/players/index.ts` and import them from `./constants.js` in `ensurePlayer` and `trashtalk`. Verify 2.1 and `convex/models/players/index.test.ts` pass with `pnpm test`.
- [x] 2.3 [engineer] Update `convex/models/players/index.test.ts` to import `DEFAULT_EMOJI` from `./constants.js`. Verify `pnpm check`.
- [x] 2.4 [engineer] Create `convex/models/rooms/constants.ts` with `DEFAULT_TIME_CONTROL_MS`, the unexported `MIN_TIME_CONTROL_MS` / `MAX_TIME_CONTROL_MS`, and `resolveTimeControlMs`; remove them from `convex/models/rooms/index.ts` and import from `./constants.js` (used by `create`, `join`, `get`, `rematch`, `lobbies`). Keep `generateRoomCode` in `index.ts`. Verify 2.1 and `convex/models/rooms/index.test.ts` clamp cases pass.
- [x] 2.5 [engineer] In `convex/models/pairings/index.ts`, import `resolveTimeControlMs` from `../rooms/constants.js` and keep `generateRoomCode` from `../rooms/index.js`. Verify `convex/models/pairings/index.test.ts` passes.
- [x] 2.6 [engineer] Regenerate `convex/_generated/api.d.ts` with `pnpm exec convex codegen` (or add the `models/players/constants` and `models/rooms/constants` entries by hand in sorted order if codegen needs a deployment). Verify `pnpm check` and that the diff only adds those module entries.

## 3. Client imports

- [x] 3.1 [engineer] Import `DEFAULT_EMOJI` from `convex/models/players/constants.js` in `src/lib/components/ui/playing/playing.svelte`, `src/lib/features/play/checkers/checkers.svelte`, `src/lib/features/play/tictactoe/tictactoe.svelte`, and `src/lib/features/play/chess/chess.svelte`. Verify with `pnpm test` that 1.1 now lists only `play.svelte`.
- [x] 3.2 [engineer] Import `DEFAULT_TIME_CONTROL_MS` from `convex/models/rooms/constants.js` in `src/lib/features/core/play/play.svelte`. Verify 1.1 passes and `play.svelte.test.ts` still passes.

## 4. Docs (parallel-safe)

- [x] 4.1 [engineer] In `.agents/skills/twoplay/references/backend.md`, change the trashtalk trust-boundary line to cite `players/constants.ts`, and add one line: client code value-imports only function-free Convex modules (`constants.ts`, `rules.ts`, `engine.ts`, `schema.ts`, game `index.ts`, `_generated/api`), enforced by `convex/client-boundary.test.ts`. Verify `pnpm format:check`.
- [x] 4.2 [engineer] Add a dated entry at the top of `.agents/skills/twoplay/references/decisions.md` with the same rule, why (Convex warns and the browser loads server function modules), supersedes "—", follow-ups "—". Verify `pnpm format:check`.

## 5. Verification

- [x] 5.1 [engineer] `pnpm test` passes, including `convex/client-boundary.test.ts`.
- [x] 5.2 [engineer] `pnpm check` reports 0 errors and 0 warnings.
- [x] 5.3 [engineer] `pnpm format:check` passes.
- [x] 5.4 [engineer] `pnpm build` succeeds.
- [x] 5.5 [engineer] Live QA (`browser-a`, `browser-b`): with the console open, load `/`, `/play`, and a room page (create a room in `browser-a`, join in `browser-b`); the console shows zero "Convex functions should not be imported in the browser" warnings, the player strips show the default emoji, and the `/play` time control defaults to 5 minutes.
