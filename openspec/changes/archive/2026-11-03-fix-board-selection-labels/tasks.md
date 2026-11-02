# Tasks

## 1. Chess labels (parallel-safe)

- [x] 1.1 [engineer] In `src/lib/features/play/chess/labels.test.ts`, add failing cases: "g1, white knight, selected"; "f3, empty, move here"; "d5, black pawn, move here"; "e8, black king, in check, selected". Pass `isSelected`/`isDestination` in the options, and add `false` for both to the existing cases. Verify `pnpm test src/lib/features/play/chess/labels.test.ts` fails on the new cases only.
- [x] 1.2 [engineer] In `src/lib/features/play/chess/labels.ts`, extend `squareLabel`'s options with `isSelected` and `isDestination`. Build every label, empty squares included, as `coord, piece|empty, [in check], [can move unless selected], [selected], [move here]`. Verify 1.1 passes.
- [x] 1.3 [engineer] In `src/lib/features/play/chess/chess.svelte.test.ts`, add failing tests: after clicking g1 in the starting position, g1 is "g1, white knight, selected" and f3 is "f3, empty, move here"; clicking g1 again restores "g1, white knight, can move" and "f3, empty".
- [x] 1.4 [engineer] In `src/lib/features/play/chess/chess.svelte`, pass `isSelected: room.effectiveSelected === name` and `isDestination: room.destinations.includes(name)` to `squareLabel`. Verify 1.3 passes.

## 2. Checkers labels (parallel-safe)

- [x] 2.1 [engineer] In `src/lib/features/play/checkers/labels.test.ts`, move the existing cases to the `{ ability, isSelected, isDestination }` argument and add failing cases: "a3, cyan man, selected" (ability "move" given, still dropped); "b4, empty, move here". Verify `pnpm test src/lib/features/play/checkers/labels.test.ts` fails on the new cases only.
- [x] 2.2 [engineer] In `src/lib/features/play/checkers/labels.ts`, change `squareLabel`'s third argument to `{ ability, isSelected, isDestination }`. Build every label, empty squares included, as `coord, piece|empty, [can move|can capture unless selected], [selected], [move here]`. Verify 2.1 passes.
- [x] 2.3 [engineer] In `src/lib/features/play/checkers/checkers.svelte.test.ts`, add failing tests: after clicking a3 in the starting position, a3 is "a3, cyan man, selected" and b4 is "b4, empty, move here"; clicking the empty a5 then deselects and restores "a3, cyan man, can move" and "b4, empty" (clicking a3 again keeps it selected in checkers). Change the two existing `"b4, empty"` clicks that follow selecting a3 to `"b4, empty, move here"`.
- [x] 2.4 [engineer] In `src/lib/features/play/checkers/checkers.svelte`, pass `{ ability: room.abilityOf(index), isSelected, isDestination }` to `squareLabel`. Verify 2.3 passes.

## 3. Verification

- [x] 3.1 [engineer] `pnpm test` passes.
- [x] 3.2 [engineer] `pnpm check` passes.
- [x] 3.3 [engineer] `pnpm format:check` passes.
- [x] 3.4 [engineer] `pnpm build` passes.
- [x] 3.5 Live QA in `browser-a` and `browser-b`, one chess room and one checkers room. On the mover's turn, select a piece, read the square names from the accessibility tree: the piece square says "selected", each target says "move here", including a chess capture. Deselect (chess: click the piece again; checkers: click an empty non-target square), and the names return to "can move" and plain "empty". Select a different piece, and the names follow the new selection.
