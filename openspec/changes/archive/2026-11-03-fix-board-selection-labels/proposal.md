# Proposal

## Why

On the live chess and checkers boards, square labels never say "selected" or "move here". After picking a piece, a screen-reader user can't tell what they picked or where it can go. The Learn practice boards already announce both.

## What Changes

- The square holding the viewer's selected piece adds "selected" and drops "can move" or "can capture".
- Each legal destination of the selected piece adds "move here". This includes chess captures ("d5, black pawn, move here") and checkers capture landings, which are empty squares.
- Label order: `coord, piece|empty, [in check], [can move|can capture], [selected], [move here]`. This matches Learn.

Out of scope: tic-tac-toe (it has no selection), `aria-pressed`, the Learn and sandbox boards, and any Convex, schema, or rule change.

## Capabilities

### New Capabilities

### Modified Capabilities

- `board-accessibility`: "Checkers square labels" and "Chess square labels" add "selected" and "move here".

## Impact

- `src/lib/features/play/chess/labels.ts` and `src/lib/features/play/checkers/labels.ts`: `squareLabel` takes selection state and labels empty squares too.
- Call sites: `chess.svelte` and `checkers.svelte`. Tests: both `labels.test.ts` files, `chess.svelte.test.ts`, and `checkers.svelte.test.ts`. Two checkers component tests click `"b4, empty"` after selecting a3 and must use `"b4, empty, move here"`.
- No schema change, no auth or trust-boundary change, no new Convex function.
