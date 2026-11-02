# Proposal

## Why

The rules section is called "How to play". The user wants it named "Learn", a shorter label for the same pages.

## What Changes

- **BREAKING (URLs):** the rules pages move from `/how-to-play` and `/how-to-play/<game>` to `/learn` and `/learn/<game>`.
- `/how-to-play` and every path under it permanently redirect (308) to the same path under `/learn`, so indexed and shared links keep working.
- Titles: the index becomes "Learn" (`Learn · twoplay`), each game page "Learn <Game>" (`Learn Checkers · twoplay`). Game descriptions start "Learn <Game> on twoplay: …".
- Labels: the footer link, the Tour button, and the tic-tac-toe Rules popover link ("Learn the rules") use the new name, and every link points at `/learn`.
- The sitemap and indexable paths list `/learn` paths instead of `/how-to-play` paths.
- The `how-to-play` capability spec is replaced by a `learn` spec.

Out of scope: the internal `features/core/rules` module and `RULES` export, the room "Rules" popover name, README's "How to play" section, archived changes, and the in-flight `add-ui-click-sounds` change wording (its main spec is updated here). No Convex, schema, auth, or trust-boundary change.

## Capabilities

### New Capabilities

- `learn`: the per-game rules pages at `/learn`, replacing `how-to-play`, plus the redirect from the old paths.

### Modified Capabilities

- `how-to-play`: removed, superseded by `learn`.
- `app-navigation`: the footer links "Learn" at `/learn`.
- `board-hints`: the tic-tac-toe Rules popover links to `/learn/tictactoe`.
- `search-indexing`: indexable paths and the sitemap use `/learn` paths.
- `ui-click-sounds`: the practice-board scenario names the Learn practice board.

## Impact

- Routes: `src/routes/how-to-play/` moves to `src/routes/learn/`; a redirect endpoint sits at `src/routes/how-to-play/`.
- Links: `footer.svelte`, `tour.svelte`, `rules/door.svelte`, `tictactoe.svelte`.
- Copy: `rules/rules.ts` descriptions.
- SEO: `utils/seo` `INDEXED_PATHS`, sitemap.
- Tests and `.agents/scripts/layout-shift.mjs` route list.
- No schema change, no auth change, no new Convex function.
