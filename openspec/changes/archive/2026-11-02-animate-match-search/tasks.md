# Tasks

## 1. Searching mood [designer]

- [x] 1.1 [designer] Add `searching` to `MoodPresence` and the searching state to `mood.svelte` (faster speed, larger scale for both seats when `status` is null), test-first in `mood.svelte.test.ts` (searching changes speed and scale; a board status still wins), verify with `pnpm test`

## 2. Queue card motion [designer]

- [x] 2.1 [designer] In `play.svelte`, set `mood.searching` while `viewKind === "queued"` and reset it on cleanup; add a running comet ring to the card and an aria-hidden radar (ripples and orbiting seat dots, `motion-safe` only, still under reduced motion) to the timer box, with any keyframes in `layout.css`; extend `play.svelte.test.ts` to cover the searching flag on queue and cancel and the aria-hidden decoration; verify with `pnpm test` and `pnpm check`

## 3. Verification

- [x] 3.1 `pnpm test`, `pnpm check`, `pnpm format:check`, `pnpm build` pass
- [x] 3.2 Layout shift on /play at 390px and 1280px, setup → queued → cancel, records 0 entries
- [x] 3.3 Live QA in browser-a/browser-b: queued view shows motion; cancel stops it; reduced motion shows a still treatment; matching two players still works
