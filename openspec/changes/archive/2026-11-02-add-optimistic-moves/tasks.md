# Tasks

No Convex changes: all work is client-side (design.md, Trust boundary).

## 1. Room pending queue [engineer]

- [x] 1.1 Add `deferred<T>()` (hold, resolve, reject) to `src/lib/utils/multiplayer/room/fake-convex.svelte.ts`; verified by its use in 1.2.
- [x] 1.2 Write failing tests in `room.svelte.test.ts` (rewrite `SeatRoom` to pass a tic-tac-toe client engine): pending shows in `displayState`/`activeSeat`/`isMyTurn`; confirm by state match, by resolve, and on a no-op; duplicate snapshot keeps it; reject drops the tail, sets `rejection`, leaves `error` null; round change drops it; scrubbing ignores it; clock handoff 50s/55s; no timeout claim from the predicted clock; `isMyTurnConfirmed` stays true through a rejection.
- [x] 1.3 Implement in `room.svelte.ts` (`ClientEngine` constructor arg, `#pending`, `liveState`, `#confirmedCount`, concrete `activeSeat`, `#confirmedActiveSeat`, `isMyTurnConfirmed`, `rejection`, `submitMove`, `rematch` clearing, `#serverRemaining`, timeout `$effect` on server values) until 1.2 passes.

## 2. Game room adapters [engineer] (parallel-safe with 3)

- [x] 2.1 Write failing tests in `tictactoe/game.svelte.test.ts`: `play` shows the mark while `play` is held, and `canPlay` is false for every board while pending.
- [x] 2.2 Write failing tests in `checkers/game.svelte.test.ts`: a pending move shows the piece; a capture that must continue keeps the piece selected and the second jump sends a second `play` after the first; rejecting the first drops both.
- [x] 2.3 In `tictactoe/game.svelte.ts` pass a client engine adapter over `tictactoeEngine` to `super`, and remove `override activeSeat` and its `#state`/`#live*` chain; 2.1 passes.
- [x] 2.4 In `checkers/game.svelte.ts` pass a client engine adapter over `checkersEngine` to `super`, and remove `override activeSeat` and `#state`/`#liveTurn`/`#liveLegalMoves`/`#liveWinner`; 2.2 passes.

## 3. Rejection feedback [designer] (parallel-safe with 2)

- [x] 3.1 Write failing tests: `board.svelte.test.ts` checks that a new `rejectionId` calls a stubbed `Element.prototype.animate` with transform-only keyframes, and does not under reduced-motion `matchMedia`. `tictactoe.svelte.test.ts` checks that one mark node and one `playMoveSound` call survive the confirming snapshot, and that a rejection shows one "Move not accepted" toast. `checkers.svelte.test.ts` checks that a rejection shows one toast.
- [x] 3.2 Add the optional `rejectionId` prop and its WAAPI shake to `components/layout/board/board.svelte`; 3.1 board test passes.
- [x] 3.3 In `tictactoe.svelte` and `checkers.svelte`, add the `getToaster()` rejection `$effect`, pass `rejectionId={room.rejection?.id}` to `Board`, and switch `new TurnAlert` to `room.isMyTurnConfirmed`; 3.1 component tests pass.

## 4. Verification

- [x] 4.1 [engineer] `pnpm test`, `pnpm check` (0/0), `pnpm format:check`, and `pnpm build` all pass.
- [x] 4.2 [steward] Update `.agents/skills/twoplay/references/games.md`: a new game passes a client engine to `Room` instead of overriding `activeSeat`.
- [x] 4.3 [qa] Live QA in `browser-a` and `browser-b`, with layout-shift observers running in both:
  - With `browser-a` throttled (≥1s latency), the move, turn ring, and sound show at once and `browser-b` gets the move on commit.
  - The opponent resigns mid-flight, and `browser-a` gets the rollback, toast, and shake.
  - At least three throttled turns record no layout-shift entries.
  - With reduced motion emulated, a rejection shows no shake but still shows the toast.
- [x] 4.4 Review fixes
