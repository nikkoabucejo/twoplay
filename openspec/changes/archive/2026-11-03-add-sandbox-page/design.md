# Design

## Context

The live game components (`features/play/{tictactoe,checkers,chess}`) build a Room from a Convex subscription and can't take static state. Learn already has prop-driven copies of each board (`features/core/rules/*-board.svelte`), and `chess-board` already mounts `ChessPromotion` through its `promotion` prop. `Board` and `ResultCard` in `components/layout/board/` are prop-driven.

## Goals / Non-Goals

**Goals:** one page, static fixtures, real engine-shaped positions.

**Non-Goals:** splitting the live game components into view and container (option B, declined); matching in-game-only effects.

## Decisions

- **Feature folder `features/core/sandbox/`.** `sandbox.svelte` lays out the sections (Sound, Game); `interactions.svelte` holds the game previews; `fixtures.ts` builds the static positions and `ResultView`s. The sound and mood lab moves into this folder as `sound.svelte`; its former `features/core/sound-lab/` folder is removed. Alternative: put fixtures in the route. Rejected: routes stay thin.
- **Fixtures through the real engines and rules.** Positions are built with `tictactoeEngine`, the checkers helpers, and the chess rules helpers (read-only imports, as Learn does), so `checkSquare`, destinations, and strike lines come from the same code the game uses. A fixtures test asserts each preview's state (winner, check, mate, draw), so a rule change can't silently break a preview.
- **Promotion preview.** `ChessBoard` with `onselect` set, a pawn on the 8th (or 1st) rank as the anchor square, and a toggle for white and black. Selecting the square opens the picker; pick or cancel closes it. No state beyond `isOpen` and the color.
- **Result cards.** `ResultCard` with static `ResultView`s and no-op footer handlers, rendered inline (not as an overlay) in a grid.
- **Indexing.** Remove `/sandbox/sound` from `INDEXED_PATHS`. Not listing `/sandbox` makes it `noindex` and leaves it out of the sitemap under the existing indexing rule. A `search-indexing` delta drops `/sandbox/sound`, which add-chess added to the main spec.

## Risks / Trade-offs

- [Learn boards drift from in-game boards] → The previews label themselves as using the Learn board; accepted by the user.
- [Long page shifts while previews mount] → Fixed-size board frames; checked with `layout-shift.mjs`.
- [`ResultCard` assumes an overlay parent] → Wrap each in a sized, `relative` frame; check visually.

## Migration Plan

Delete `src/routes/sandbox/sound/`. No redirect, matching the recent `/how-to-play` removal.
