# Tasks

## 1. Resign banks elapsed time

- [x] 1.1 [engineer] In `convex/models/games/index.test.ts` `describe("resign")`, add a test: `vi.useFakeTimers()`, `vi.setSystemTime(1_000_000)`, `seatedRoom(t, "tictactoe", 60_000)`, advance 3_000, seat 0 (`a`) resigns; expect seat 0's clock `remaining` 57_000 and no clock with `turnedAt`. Verify it fails with 60_000 via `pnpm test convex/models/games/index.test.ts`.
- [x] 1.2 [engineer] Add an off-turn control test in the same block: same setup, seat 1 (`b`) resigns; expect seat 0 57_000, seat 1 60_000, no running clock. Verify it passes before and after the fix.
- [x] 1.3 [engineer] In `resign` (`convex/models/games/index.ts`), delete `ctx.db.patch(ownClock._id, { turnedAt: undefined })`; keep the `ownClock` lookup and its "You are not playing this round" check. Verify 1.1, 1.2, and the existing "freezes the resigning player's running clock" test pass.

## 2. Abandon and sweep bank elapsed time

- [x] 2.1 [engineer] In `convex/models/rooms/index.test.ts` `describe("abandon")`, add a test: fake timers at `START`, `seatedRoom(t, "tictactoe", 60_000)`, advance 3_000, seat 0 abandons; expect seat 0's clock `remaining` 57_000 and no running clock. Verify it fails with 60_000 via `pnpm test convex/models/rooms/index.test.ts`.
- [x] 2.2 [engineer] In `forfeitRoom` (`convex/models/rooms/index.ts`), delete the `turnedAt: undefined` patch before `markEnded(..., "abandon")`. Verify 2.1 and existing `abandon` and `sweep` tests pass.
- [x] 2.3 [engineer] In `sweep`'s empty-room branch (`convex/models/rooms/index.ts`), delete the `turnedAt: undefined` patch before `markEnded(..., "abandon")`. Verify existing "rooms waiting for an opponent" sweep tests pass.

## 3. Verification

- [x] 3.1 [engineer] `pnpm test` passes.
- [x] 3.2 [engineer] `pnpm check` passes.
- [x] 3.3 [engineer] `pnpm format:check` passes.
- [x] 3.4 [engineer] `pnpm build` passes.
- [x] 3.5 [engineer] Live QA in `browser-a` and `browser-b`: start a timed room, let seat 0's clock run a few seconds, resign on seat 0's turn; both browsers show seat 0's clock below its start value and not running. Repeat with abandon.
