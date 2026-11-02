# Tasks

Every code task is `[engineer]`. Tests come first: each "failing test" task must fail against the current code (or flip an existing `test.fails` to `test`) before its implementation task starts. Use `setup`, `signIn`, and `seatedRoom` from `convex/test.setup.ts`. Groups 2 to 5 edit `convex/models/rooms/index.ts` or `convex/models/games/index.ts`, so run them in order.

## 1. Schema

- [x] 1.1 [engineer] Add optional `settledAt: v.optional(v.number())` and `isNoContest: v.optional(v.boolean())` to `convex/models/games/schema.ts`, and `expiredAt: v.optional(v.number())` to `convex/models/pairings/schema.ts`, each with a one-line why comment. Verify with `pnpm check`.

## 2. Round settlement

- [x] 2.1 [engineer] In `convex/models/games/index.test.ts`, add `describe("settleRound")` with failing tests: a won board credits score 1, rating 408/392, and `results.mmr` for both seats; a second call changes nothing; a draw credits nothing and sets `settledAt`; an unfinished round with no option writes nothing; `shouldVoidIfUnfinished` marks `isNoContest`; a room short a seat is no-contest with no rating row written; every running clock ends with `turnedAt` unset and `remaining` banked.
- [x] 2.2 [engineer] In `convex/models/games/index.test.ts`, add failing tests under `resign` and `timeout`: the opponent's score is 1 and rating 408 right after the call, with no rematch.
- [x] 2.3 [engineer] In `convex/models/rooms/index.test.ts`, add failing tests: under `play`, a winning move credits seat 0 at once (score 1, ratings 408/392) and a drawing move credits nobody; under `rematch`, after a settled win the scores and ratings don't change again and round 2 exists; a won board with no `settledAt` (patched via `t.run`) is credited once on rematch; under `abandon`, a win settled before seat 1 abandons isn't credited twice, and the host abandoning an unjoined room leaves their rating at the default with the round `isNoContest`; under `sweep`, the waiting-room branch marks the round no-contest, and the all-idle branch marks it no-contest with every clock stopped.
- [x] 2.4 [engineer] Implement `settleRound(ctx, room, game, options?: { shouldVoidIfUnfinished?: boolean })` in `convex/models/games/index.ts` per design Decision 1, importing `applyResult` (`ratings/index.js`) and `creditMmr` (`results/index.js`). Verify that 2.1 passes.
- [x] 2.5 [engineer] Call `settleRound` from `resign` and `timeout` after `markEnded` in `convex/models/games/index.ts`. Verify that 2.2 passes.
- [x] 2.6 [engineer] In `convex/models/rooms/index.ts`, call `settleRound` from `play` when `afterStatus.isOver`. Replace `forfeitRoom`'s crediting block with a `settleRound` call after the `abandon` mark. Add `settleRound` to the `sweep` waiting-room branch and (with `shouldVoidIfUnfinished: true`) to the all-idle branch. Make `rematch` call `settleRound` and drop its own crediting before `createGame`. Remove imports that are now unused. Verify that 2.3 passes.
- [x] 2.7 [engineer] Update existing tests in `convex/models/rooms/index.test.ts` and `convex/models/games/index.test.ts` that assert crediting happens only on rematch, or rely on the removed "winner already left" guard. Keep each test's intent and change only what the new timing makes wrong. Verify that the `convex` Vitest project passes.

## 3. History and stats

- [x] 3.1 [engineer] In `convex/models/rooms/index.test.ts`, add failing tests: under `history`, an abandoned unjoined room is missing; an idle-swept round isn't "playing" and is left out; an old closed room whose unfinished round has no `isNoContest` (set up via `t.run`) is left out; an old unjoined round with an `abandon` result isn't a loss; a resigned round has `reason: "resign"`, a timed-out round `reason: "timeout"`, and a round won on the board `reason: null`. Under `stats` and `statsForUsers`, the abandoned unjoined room counts 0 games.
- [x] 3.2 [engineer] In `convex/models/rooms/index.ts`, make `classifyGameResult` return internal `"no-contest"` per design Decision 3. Filter it out in `history` and skip it in `computePlayerStats`. Add `reason?: "timeout" | "resign" | "abandon" | null` to `GameHistoryEntry` and set it from the round's `results` row that has a `state`. Verify that 3.1 passes and `pnpm check` shows no type error in `src/`.

## 4. Room lookups and play guards

- [x] 4.1 [engineer] Write failing tests: in `convex/models/rooms/auth.test.ts` under `getRoomByCode`, lowercase and padded codes resolve. In `convex/models/rooms/index.test.ts`, `join` with a lowercase code seats B and returns the uppercase code; `get` with a lowercase code returns the room; `get` for round 5 of a round-1 room returns round 1 with `latestRound` 1 and `isLive` true; flip the `play` `test.fails` "rejects a move while the second seat is still empty" to `test`, expecting "Waiting for opponent"; `rematch` with `round: 1` called twice after round 1 ends leaves 2 rounds and doesn't throw; `rematch` without `round` mid-round 2 still throws "This round isn't over yet". In `convex/models/games/index.test.ts`, `history` for round 5 returns round 1's moves, and flip the `resign` `test.fails` "rejects a resign while the second seat is still empty" to `test`, expecting "Waiting for opponent".
- [x] 4.2 [engineer] Normalize the code with `code.trim().toUpperCase()` in `getRoomByCode` (`convex/models/rooms/auth.ts`). Verify that the 4.1 code-case tests pass.
- [x] 4.3 [engineer] Make `getGame` in `convex/models/games/index.ts` fall back to `getCurrentGame` when the round has no row. Verify that the 4.1 round tests pass.
- [x] 4.4 [engineer] Throw "Waiting for opponent" when `room.players.length < getEngine(room.type).playerCount`, after `requirePlayer`, in `play` (`convex/models/rooms/index.ts`) and `resign` (`convex/models/games/index.ts`). Verify that both flipped tests pass.
- [x] 4.5 [engineer] Add `round: v.optional(v.number())` to `rematch` and return early after `requirePlayer` when it differs from the live round. Verify that the 4.1 rematch tests pass.

## 5. Matchmaking

- [x] 5.1 [engineer] Write failing tests. In a new `convex/models/pairings/queue.test.ts`: `pairingByUser` and `leaveQueue` (deletes an entry, expired or not; no-op without one). In `convex/models/pairings/index.test.ts`: flip `test.fails` "enqueue does not pair with an opponent who has since entered a room" to `test`, and also assert A's entry is gone and B is waiting; a stale entry ahead of a free user C pairs B with C and deletes the stale one; `sweep` sets `expiredAt` instead of deleting, then `status` is false and `expired` is true; `sweep` deletes an entry expired over 60 minutes; enqueueing after expiry leaves one unexpired entry and `expired` false; `expired` throws "Sign in to play" when signed out and is false for an unqueued user. In `convex/models/rooms/index.test.ts`: `create` and `join` (new seat) remove the caller's entry, and `join` on an existing seat leaves it.
- [x] 5.2 [engineer] Add `convex/models/pairings/queue.ts` with `pairingByUser` and `leaveQueue`, importing only `_generated` (design Decision 4). Use them in `enqueue`, `cancel`, and `status` in `convex/models/pairings/index.ts`. Verify that the `queue.test.ts` tests pass.
- [x] 5.3 [engineer] In `convex/models/pairings/index.ts`, rework `enqueue`: `leaveQueue` before returning an active room, delete an expired own entry, and walk unexpired `byType` entries oldest first, deleting entries whose user is missing or has an active room. Make `status` ignore expired entries, add the `expired` query, and make `sweep` expire entries, then delete them after `EXPIRED_RETENTION_MS`. Verify that the 5.1 pairing tests pass.
- [x] 5.4 [engineer] Call `leaveQueue` in `create` after `requireUser`, and on `join`'s redirect and new-seat paths, in `convex/models/rooms/index.ts`. Verify that the 5.1 room tests pass.

## 6. Trashtalk (parallel-safe)

- [x] 6.1 [engineer] In `convex/models/players/index.test.ts`, flip `test.fails` "trashtalk rejects an emoji that isn't a hex codepoint" to `test`, expecting "Unknown emoji" with the emoji unchanged. Add failing tests: "1f525" is accepted; a spectator gets "You are not a player in this room"; a player in a closed room gets "This room is no longer active" with the emoji unchanged.
- [x] 6.2 [engineer] Export `TRASHTALK_EMOJIS` (`DEFAULT_EMOJI` plus the ten `EMOJI_OPTIONS` codepoints from `src/lib/components/layout/board/board.svelte`) from `convex/models/players/index.ts`. Add the active-room, `leftAt`, and allow-list checks to `trashtalk` in the design Decision 7 order. Verify that 6.1 passes.

## 7. Cursor presence (parallel-safe)

- [x] 7.1 [engineer] In `src/lib/features/presence/cursor/cursor.svelte.test.ts`, add failing tests using `setQueryResult(api.models.rooms.index.active, ...)` and `mutationFor`: a spectator (`active` null) or a closed room (`active` for another code) sends no `cursors.update` on `move`; a seated viewer (`active` `{ code: "ABCD" }` with `getCode` returning "abcd") sends one; `leave()` and `dispose()` send no `cursors.clear` when nothing was sent, and one after an update.
- [x] 7.2 [engineer] In `src/lib/features/presence/cursor/cursor.svelte.ts`, subscribe to `api.models.rooms.index.active`, derive `#isSeated` by comparing uppercase codes, gate `move` on it, and track `#hasSent` to gate `leave` and `dispose` (design Decision 8). Verify that 7.1 passes.

## 8. Knowledge sync

- [x] 8.1 [steward] Update `.agents/skills/twoplay/references/backend.md`: the `games.settledAt`/`isNoContest` and `pairings.expiredAt` fields, `pairings.expired` in the API list, settlement now in `settleRound` rather than `rematch`, and case-insensitive codes. Record "rounds settle when they end" in `references/decisions.md`. Verify against the merged code.
- [x] 8.2 [engineer] Review fixes: `claimExpiredClock` runs before `forfeitRoom` and the all-idle sweep settle, so an expired seat loses on timeout; `roundWinnerIndex` is shared by settlement and `classifyGameResult`; `enqueue` reads unexpired entries through `byTypeAndExpired` with `.take`; `cursors.update` rejects inactive rooms and departed players and clamps x/y; the `abandon` doc, the design Risks bullet, and the cursor `active` query skip while signed out.

## 9. Verification

- [x] 9.1 [engineer] `pnpm test`, `pnpm check` (0 errors, 0 warnings), `pnpm format:check`, and `pnpm build` all pass.
- [x] 9.2 [security] Review the diff for the trust boundary in design.md: every mutation still calls `requireUser` or `requirePlayer`; settlement credits only server-derived winners, at most once; `rematch`'s `round` can't choose what gets credited; `pairings.expired` reads only the caller's row; `trashtalk` rejects strings outside the list. Fix findings before archive.
- [x] 9.3 [qa] Live QA in `browser-a` and `browser-b`:
  - A wins a tic-tac-toe round, and both strips show A's new score before anyone presses Rematch.
  - A resigns, and B's score updates at once.
  - Both press Rematch for the same finished round: one new round, no error shown.
  - B opens the room URL with the code in lowercase and takes the second seat.
  - A creates a room, abandons it before anyone joins, and /history and the leaderboard stats show no loss.
  - A spectator moving over the board makes no cursor appear for the players, and makes no failed `cursors.update` calls in the console.
