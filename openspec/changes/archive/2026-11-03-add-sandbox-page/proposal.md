# Proposal

## Why

Seeing a game's end-of-round visuals or rare UI (a tic-tac-toe win line, the chess promotion picker, a checkmate result card) today means playing a real game to that point. The sandbox exists only as `/sandbox/sound`.

## What Changes

- Replace `/sandbox/sound` with one `/sandbox` page split into sections. **BREAKING**: `/sandbox/sound` is removed with no redirect.
- The existing sound and mood lab becomes the page's Sound section, behavior unchanged.
- Add a Game section that renders each game's UI states from static setups, with no room, sign-in, or Convex call: tic-tac-toe win, meta-win, and draw; checkers selection, must-capture, and kings; chess check, checkmate, last move, selection, and an openable promotion picker; result cards for win, loss, draw, and timeout.
- `/sandbox` is not indexed: it renders `noindex` and is not in the sitemap. The footer link points to `/sandbox`.

Out of scope: refactoring the live game components, any Convex, schema, auth, or game-rule change, and pixel-exact in-game details (piece pop-in, cursors, turn alerts, room bar).

## Capabilities

### New Capabilities

- `sandbox`: the `/sandbox` page, its sections, and the static game-state previews.

### Modified Capabilities

- `search-indexing`: `/sandbox/sound` is dropped from the indexed paths and the sitemap.

## Impact

- Routes: `src/routes/sandbox/sound/` removed, `src/routes/sandbox/+page.svelte` added.
- New feature folder `src/lib/features/core/sandbox/`, reusing the Learn boards, `Board`, `ResultCard`, and `ChessPromotion`; the sound and mood lab moves in from `features/core/sound-lab/`.
- `INDEXED_PATHS` in `src/lib/utils/seo/index.ts` drops `/sandbox/sound`; seo and sitemap tests updated.
- Footer link and its test.
- No schema change, no auth or trust-boundary change, no new Convex function.
