# Proposal

## Why

The chess and checkers boards, live and Learn, each build their square classes inline and have drifted: the checkers Learn board has a hover background that hides the last-move tint, and its move dot and selected ring skip the fade the live boards use.

## What Changes

- Add a pure helper `src/lib/components/layout/board/squares.ts` (`squareClass`, focus-ring, selected-ring, and move-dot constants), exported through the board barrel.
- Use it in the live boards (`features/play/chess/chess.svelte`, `features/play/checkers/checkers.svelte`) and the Learn boards (`features/core/rules/chess-board.svelte`, `checkers-board.svelte`).
- Checkers Learn board: drop `hover:bg-foreground/20`, add `in:fade` 150 to the dot and selected ring.
- Add `data-hint="move"` to the checkers move dots.
- Per-game pieces, marks, ring placement, and Learn board props stay as they are. Tictactoe is out of scope.

## Capabilities

### New Capabilities

- `board-squares`: shared square styling for the chess and checkers boards.

### Modified Capabilities

## Impact

- `src/lib/components/layout/board/{squares.ts,squares.test.ts,index.ts}`, `src/lib/components/layout/index.ts`.
- The four board components above. No Convex or prop changes.
