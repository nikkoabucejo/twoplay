# Review Findings — Pending Diff (clocks, rooms/auth, tabs, etc.)

Multi-agent review (security, engineer, archetech, designer, reviewer) of the staged diff (26 files). All items below have been fixed except where noted. Run `npm run check` after pulling — it passes clean (0 errors/warnings) with these changes applied.

## 1. Correctness / Logic Bugs — ✅ fixed

- **`convex/models/rooms/index.ts` `play`** — The clock-timeout write was immediately followed by a `throw`, so it never actually committed (Convex rolls back all writes from a handler that throws). Removed the dead patch; the standalone `timeout` mutation is what persists it, and the same client's own clock-driven effect calls that moments later.

- **`convex/models/rooms/index.ts` `play`** — A winning/drawing move unconditionally restarted a clock for the post-move seat even though the round was already over. Now guarded with `if (nextClock && afterStatus && !afterStatus.isOver)`.

- **`convex/models/rooms/index.ts` `create`** — `timeControlMs` had no bounds (zero/negative/`NaN` all caused bad behavior). Added `resolveTimeControlMs()`, clamping to 10s–60min server-side.

- **`isTimeout` conflated timeout and resignation** — a resigning player was flagged identically to a real clock timeout, so the UI would have mislabeled a resignation as "timed out" once `BoardStatus.reason` got wired up. Replaced the `clocks.isTimeout: boolean` field with `clocks.endReason: "timeout" | "resign" | undefined`, threaded through `resign`/`timeout`/`play`/`rematch`/`get`, `Room.endedSeat`/`Room.endReason`, and into the status label in both game components.

## 2. Security / Authorization

- **`convex/models/games/index.ts` `history` query** — Investigated: it now authorizes with `requireUser` only, not `requirePlayer`. This matches the `get` query's own model (any signed-in user with the room code can spectate room state), which this diff introduces as an explicit feature (`myIndex === null` spectator UI in `board.svelte`). **No change made** — tightening this would contradict the new spectator feature; flagging here in case that's not the intended access model.

- **`convex/models/players/index.ts` `trashtalk`** — No rate limiting on this new mutation. **Not addressed** — matches an existing project-wide gap (no rate limiting anywhere else either); adding it only here would be a partial, inconsistent fix rather than a real solution.

## 3. Naming & Consistency — ✅ fixed

- `rooms/auth.ts` no longer holds `DEFAULT_TIME_CONTROL_MS` (moved back to `rooms/index.ts`, its only consumer) and its doc comment no longer makes the false circular-import claim about that constant.
- `lobby.svelte`'s comment now points at `rooms/index.ts` where `DEFAULT_TIME_CONTROL_MS` actually lives, and the client's `DEFAULT_TIME_CONTROL_MINUTES` is now derived from that constant instead of hand-duplicated.
- The remaining-clock concept now has one name end-to-end: `remainingMs` (DB field → server response → `Room.remainingMs` → UI). Same for `turnStartedAt` (was `turnedAt` in the DB).
- `startClockNow` → `shouldStartClock`; `claimingTimeout` → the equivalent internal state in `Room` is now `#isClaimingTimeout`.
- `board.svelte`'s `onEmojiChange` prop renamed to `onTrashtalk`, matching `Room#trashtalk`/`players.trashtalk` all the way down.
- `ensureRoomPlayer` renamed to `ensurePlayerForCurrentUser` to signal it resolves the caller's own identity, unlike `ensurePlayer`.
- `moves.turn` renamed to `moves.moveNumber` to stop colliding with `GameStatus.turnIndex` and `turnStartedAt`.
- `room.svelte.ts`'s class doc comment updated to describe the current mutation set (`rematch`/`resign`/`timeout`, not `newGame`) and per-player `score`.

## 4. Architecture / Structure — ✅ fixed

- `cursors/index.ts` now imports `currentPlayer`/`getRoomByCode`/`requirePlayer` from `rooms/auth.js` directly, matching `players/index.ts` and `games/index.ts` (previously it went through `rooms/index.ts`'s re-export, the only inconsistent import site).
- `BoardClock` is now re-exported from both `board/index.ts` and `layout/index.ts`, alongside its sibling types.

## 5. UI / UX & Accessibility — ✅ fixed

- Clock/footer row now uses `items-center`, aligning with the rest of the footer.
- `BoardStatus.reason` (`"timeout" | "resign"`) is now wired into the status label ("Timeout" / "Resigned" / "Winner").
- `Tabs` gained `role="tablist"`, `aria-selected` per tab, `focus-visible` ring classes, `...restProps` spreading (so callers can pass `aria-label`), and a rename from `onchange` to `onValueChange`. `lobby.svelte`'s time-control `Tabs` now passes `aria-label="Starting clock per player"`.
- `Tabs`' active/disabled styling moved into a `tv()` variants map, matching `Button`/`Spinner`.
- `clockBox` now shows a muted background for the losing seat once the round ends (previously kept its full-color tint regardless), the dead `grayscale` class (no visible effect on text) was removed, and each clock digit got an `aria-label` naming the seat.
- Checkers' board container now has `role="grid"`/`aria-label="Checkers board"`, matching tictactoe's.

## 6. Code Quality & Duplication — ✅ fixed

- The duplicated `activeSeat`/`remainingMs`/auto-claim-timeout logic in `checkers.svelte` and `tictactoe.svelte` is gone — centralized in the base `Room` class (`remainingMs` ticking getter + a single `$effect` that auto-claims timeouts). Each `*Room` subclass now only implements `activeSeat`, mapping its own turn/winner state to a generic seat index.
- Dropped the unused `timeControlMs` field from the `get` query response (nothing client-side read it).
- `DEFAULT_EMOJI` is now exported from `players/index.ts` and imported by both game components instead of being duplicated as a `"1f600"` magic string.
- `lobby.svelte`'s time-control minutes are derived from the server constant (see Naming section above) instead of kept in sync by comment only.
- `cursor.svelte.ts`: reverted `SEND_INTERVAL_MS` to 80ms and `STALE_MS` to 4000ms, and restored the `leave()` method + `onpointerleave` wiring so a peer's cursor clears immediately when the pointer leaves the tracked area instead of lingering for up to 30s.
