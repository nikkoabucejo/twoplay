# Tasks

## 1. Square helper

- [x] 1.1 [designer] Write `src/lib/components/layout/board/squares.test.ts` for the three scenarios (base, tint, mark order; no `hover:`; constants), then add `squares.ts` and export it from `board/index.ts` and `layout/index.ts`. Verify: `pnpm test squares`.

## 2. Live boards

- [x] 2.1 [designer] Use `squareClass`, `SELECTED_RING`, `MOVE_DOT` in `src/lib/features/play/chess/chess.svelte` and `src/lib/features/play/checkers/checkers.svelte`; add `data-hint="move"` to checkers dots. Verify: existing `chess`/`checkers` component tests pass.

## 3. Learn boards

- [x] 3.1 [designer] Use the helper in `src/lib/features/core/rules/chess-board.svelte` and `checkers-board.svelte`; remove `hover:bg-foreground/20`, add `in:fade` 150 and `data-hint="move"` to the checkers dot and ring; picture-mode divs pass `interactive: false`. Verify: rules board tests pass.

## 4. Verification

- [x] 4.1 `pnpm test`, `pnpm check`, `pnpm format:check`, `pnpm build` pass; layout-shift script on `/learn/chess` and `/learn/checkers`; live qa in two browsers on a chess room and a checkers room.
