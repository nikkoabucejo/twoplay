# Design

## Context

`squareLabel` in `src/lib/features/play/chess/labels.ts` and `src/lib/features/play/checkers/labels.ts` returns early for empty squares and knows nothing about the selection. The call sites already have it: `chess.svelte` has `room.effectiveSelected === name` and `room.destinations.includes(name)`; `checkers.svelte` has `isSelected` and `isDestination` as `{@const}` per square. The Learn boards (`src/lib/features/core/rules/chess-board.svelte` and `checkers-board.svelte`, `labelOf`) already add "selected" and "move here". They don't call either `squareLabel`, so they are unaffected.

## Goals / Non-Goals

**Goals:** live labels match Learn's selection wording and order.

**Non-Goals:** sharing one label function between Learn and live boards. Their piece wording differs ("Player 1 knight" vs "white knight").

## Decisions

- **Label text, not `aria-pressed`.** It matches Learn. `aria-pressed` on 64 buttons would read "not pressed" on every square. Alternative rejected for that reason.
- **Pass state in, keep `squareLabel` pure.** Chess: the options object gains `isSelected` and `isDestination`. Checkers: the third argument becomes `{ ability, isSelected, isDestination }`, mirroring chess. Alternative: append parts at the call site. Rejected because the order rule and the "drop can move when selected" rule would then live in markup and go untested by `labels.test.ts`.
- **Build the label as a list for every square.** Empty squares go through the same `[...].join(", ")` path, so "move here" applies to them. "can move"/"can capture" are emitted only when not selected. A square can't be both selected and a destination.

## Risks / Trade-offs

- [Existing tests query exact names] → `checkers.svelte.test.ts` clicks `"b4, empty"` right after selecting a3 (two tests). Update those to `"b4, empty, move here"`. The chess component tests assert names before any selection, so they stay as they are.
- [Sequencing] → `fix-checkers-last-move-tint` is landing now and edits the square `class` in `checkers.svelte`. Rebase onto it; this change edits only the `aria-label` line. `fix-client-convex-function-imports` applies after this change and edits an import line in `chess.svelte` and `checkers.svelte`. No conflict expected.
