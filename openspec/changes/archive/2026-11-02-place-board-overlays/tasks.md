# Tasks

## 1. Board overlays [designer]

- [x] 1.1 [designer] Move the "Move N of M" readout from the board overlay in `board.svelte` into the replay group of `controls.svelte` (both the row and the stacked side-panel layout), with a reserved width so showing it shifts nothing; update `board.svelte.test.ts` and the controls tests for where the readout renders; verify with `pnpm test`
- [x] 1.2 [designer] Rework the `emojiPicker` snippet in `board.svelte`: open on the side away from the board without flipping onto it, with a short heading and a grid of equal emoji buttons; keep labels and close-on-select; extend tests for close-on-select and the heading; verify with `pnpm test` and `pnpm check`

## 2. Verification

- [x] 2.1 `pnpm test`, `pnpm check`, `pnpm format:check`, `pnpm build` pass
- [x] 2.2 Live QA: stepping back shows the readout by the controls and nothing over the board; the picker never intersects the board at 390px and 1280px; no layout shift on stepping back and returning live
