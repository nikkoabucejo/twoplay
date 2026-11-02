# Proposal

## Why

The browser console logs "Convex functions should not be imported in the browser" about 3 times per page and about 20 times on `/play`. Client code value-imports constants from Convex modules that also register queries and mutations, so those modules (and their import graphs) load in the browser.

## What Changes

- Move `DEFAULT_EMOJI` and `TRASHTALK_EMOJIS` from `convex/models/players/index.ts` into a new function-free `convex/models/players/constants.ts`.
- Move `DEFAULT_TIME_CONTROL_MS` and `resolveTimeControlMs` (with its private bounds) from `convex/models/rooms/index.ts` into a new function-free `convex/models/rooms/constants.ts`.
- Point server callers (`players/index.ts`, `rooms/index.ts`, `pairings/index.ts`) and the five client files (`playing.svelte`, `checkers.svelte`, `tictactoe.svelte`, `chess.svelte`, `play.svelte`) at the new modules.
- Add a Vitest guard that fails when any non-test file under `src/` value-imports a Convex module outside an allowlist of function-free paths.
- Record the rule in `.agents/skills/twoplay/references/backend.md` and `decisions.md`.

Out of scope: moving `generateRoomCode` (it needs `MutationCtx`), changing any value, validator, or public Convex function, changing type-only imports (`history/rounds.ts`, `stats/stats.ts`, `room.svelte.ts`), and splitting `convex/models/games/index.ts`.

## Capabilities

### New Capabilities

- `client-bundle`: which Convex modules browser code may load.

### Modified Capabilities

None.

## Impact

- Code: `convex/models/players/{index,constants}.ts`, `convex/models/rooms/{index,constants}.ts`, `convex/models/pairings/index.ts`, `convex/models/players/index.test.ts`, `convex/_generated/api.d.ts` (module listing only), the five client files above, one new guard test.
- Trust boundary: `trashtalk` keeps checking the same `TRASHTALK_EMOJIS` list, and `create` / `enqueue` keep clamping with the same `resolveTimeControlMs`. Only the defining file changes. No schema change and no new or changed public Convex function.
- Sequencing: applies after `fix-resign-clock-deduction` (edits `rooms/index.ts`) and `fix-board-selection-labels` (edits `chess.svelte`, `checkers.svelte`).
