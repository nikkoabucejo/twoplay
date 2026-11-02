# Design

## Context

See proposal.md for the motivation. Each bug was re-checked against the code on 2026-11-02, including the uncommitted `add-optimistic-moves` work in the tree.

| Bug                                                      | Status             | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B2 abandon/sweep wins never scored                       | Partly confirmed   | `forfeitRoom` credits the opponent on abandon and on a one-seat-stale sweep. The all-idle sweep and the waiting-room sweep credit nothing. A natural win, resign, or timeout is credited only by `rematch` (`convex/models/rooms/index.ts`). A finished round whose room closes before a rematch is credited only if the closing player lost it: `forfeitRoom` skips crediting when the leaver was the winner.                                                                                                                                                                                            |
| B3 inactive sweep leaves round "Playing"                 | Confirmed          | The `staleCount === players.length` branch of `sweep` sets `leftAt` and closes the room but writes no result. `classifyGameResult` then returns "playing" for good.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| B4 abandoning an unjoined room is a Loss                 | Confirmed          | `forfeitRoom` marks the host's result `abandon`. `classifyGameResult` takes `otherPlayer(0) = 1` as the winner, so the host gets "loss" in `history` and `stats`.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| B21 score updates only after Rematch                     | Confirmed          | `players.score` is patched only in `rematch` and `forfeitRoom`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| B5 queue entry survives entering a room                  | Confirmed          | `create` and `join` never touch `pairings`. `enqueue` takes `byType.first()` without checking the opponent's active rooms. The existing `test.fails` in `convex/models/pairings/index.test.ts` covers it.                                                                                                                                                                                                                                                                                                                                                                                                 |
| B17 swept entry not surfaced                             | Confirmed          | `pairings.sweep` deletes the entry, so `status` looks the same as after a match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| B6 play before the room is full                          | Confirmed          | `play` has no seat-count check (`test.fails` in `rooms/index.test.ts`). `resign` has the same gap (`test.fails` in `games/index.test.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| B9 trashtalk accepts anything                            | Confirmed          | `trashtalk` patches any string and checks neither `leftAt` nor room status (`test.fails` in `players/index.test.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| B13 future round reads as a missing room                 | Confirmed          | `getGame` returns null for a missing round, and `get` then returns null, the same as an unknown code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| B19 codes are case-sensitive                             | Confirmed          | `getRoomByCode` does an exact `byCode` match. Only `/play`'s join form uppercases. A typed `/tictactoe/abcdef` URL fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| B20 double rematch                                       | Confirmed, mild    | Convex serializes the two calls. The second one sees a fresh round and throws "This round isn't over yet", which the client shows as an error. If the new round ended first, the second call would skip it.                                                                                                                                                                                                                                                                                                                                                                                               |
| B16 spectator cursor spam                                | Confirmed          | `CursorPresence.move` always calls `cursors.update`, which throws for a spectator on every throttled move.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| B1 checkers timeout loop when signed out or room missing | **Fixed, no task** | `Room` now owns a concrete `activeSeat`, and the timeout `$effect` reads `#confirmedActiveSeat` (`src/lib/utils/multiplayer/room/room.svelte.ts`). When signed out, `rooms.get` throws, so `data` is undefined. When the room is missing, `data` is null. Either way `#serverState` is null, `#seatOf` returns null, and the effect returns before `timeout()`. The fix is in the uncommitted `add-optimistic-moves` change, so it must land before or with this one. The remaining loop risk (the server ignores a claim and the effect re-fires) is B7, out of scope. That `test.fails` stays as it is. |

Constraints:

- Query return shapes are fixed. Changes C and D read `rooms.history`, `rooms.stats`, `rooms.statsForUsers`, and `ratings.*`, and `src/lib/utils/multiplayer/room/fake-convex.svelte.ts` types `RoomSnapshot` from `rooms.get`.
- `room.svelte.ts`, `play.svelte`, and the game components belong to other changes. The only client file here is `src/lib/features/presence/cursor/cursor.svelte.ts`.
- `mutation({ args })` validators evaluate at module load, so new imports must not close a cycle between modules that both define validators (backend.md).

## Goals / Non-Goals

**Goals:**

- Settlement is one code path, called from every place a round ends, and safe to call twice.
- History and stats agree on what counts, including rows written before this change.

**Non-Goals:**

- Changing the rating formula, the idle thresholds, or the sweep cadence.
- Backfilling `settledAt` on old games. The read-side rules below cover old rows.
- Rate limiting (see backend.md, Known gaps).

## Decisions

### 1. Settlement state lives on the game row

`games` gains `settledAt?: number` and `isNoContest?: boolean`. `settleRound(ctx, room, game, options?)` in `convex/models/games/index.ts`:

1. Returns if `game.settledAt` is set.
2. Finds how the round ended: a `results` row with `state`, otherwise the board's `gameStatus().isOver`. If neither is true and `options.shouldVoidIfUnfinished` is set, the round is no-contest. If neither is true and the option is unset, it returns without writing.
3. Stops every running clock of the game: `remaining -= now - turnedAt` (floored at 0) and `turnedAt` cleared.
4. A round is no-contest when the room has fewer players than `engine.playerCount`, or it was voided in step 2. Then it patches `{ settledAt, isNoContest: true }` and stops.
5. Otherwise it finds the winner the way `rematch` does today (the ended seat's opponent, or `roundWinner`). For a decisive round it adds 1 to the winner's score, calls `applyResult`, and calls `creditMmr` for both seats. It then patches `{ settledAt }`.

Convex runs each mutation as a serializable transaction, so two concurrent settles conflict, one retries, and the retry stops at step 1. That check is enough for idempotency.

Alternatives:

- _Infer "settled" from `results.mmr`._ A draw never writes `mmr`, so a settled draw looks the same as an unsettled one, and no-contest has nowhere to live. Rejected.
- _A separate `settlements` table._ It adds a table, an index, and a join for every history row, for two scalar facts about one game. Rejected.

`settleRound` lives in `games/index.ts` because it needs `gameStatus`, `roundWinner`, and `getEngine`, and `resign` and `timeout` live there too. Its imports (`ratings/index.ts`, `results/index.ts`, `clocks/index.ts`) don't import `games` or `rooms/index.ts`, so no new cycle appears. Putting it in `results/index.ts` would make `results` and `games` import each other.

### 2. Who calls `settleRound`

| Caller                                                         | When                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rooms.play`                                                   | After the move is written, when `afterStatus.isOver`                                                                                                                                                                                                              |
| `games.resign`, `games.timeout`                                | After `markEnded`                                                                                                                                                                                                                                                 |
| `forfeitRoom` (used by `abandon` and the one-seat-stale sweep) | Marks `abandon` on an unfinished round as today, then always calls `settleRound`. The old crediting block and its "winner already left" guard go away. Mutual abandon can't reach it now, because the first abandon closes the room and the second returns early. |
| `sweep`, waiting-room branch                                   | After marking `abandon`. An empty seat makes it no-contest.                                                                                                                                                                                                       |
| `sweep`, all-idle branch                                       | `shouldVoidIfUnfinished: true` before closing                                                                                                                                                                                                                     |
| `rooms.rematch`                                                | Before `createGame`, for a round that ended before this change and was never settled. It is a no-op for every round that ends after this change.                                                                                                                  |

`rematch` drops its own crediting code. Its "round isn't over" check stays.

### 3. No-contest on the read side

`classifyGameResult` returns a fourth internal value, `"no-contest"`. Callers drop it, so the exported `GameHistoryEntry["result"]` stays `"win" | "loss" | "draw" | "playing"`. The rules, in order:

1. `game.isNoContest` → no-contest.
2. Round not over: a closed room → no-contest (an old all-idle close), otherwise "playing".
3. Round over and the room short a seat → no-contest (an old unjoined abandon).
4. Otherwise win, loss, or draw as today.

`history` filters no-contest rounds out of `games`, and its existing `games.length > 0` filter drops rooms left empty. `computePlayerStats` skips them.

`GameHistoryEntry` gains an optional `reason?: "timeout" | "resign" | "abandon" | null`, for change C to display. `history` sets it from the round's `results` row that has a `state` (the same row `rooms.get` reads for its `reason`), or null when no row has one. The field is optional in the type so existing fixtures and consumers compile unchanged, but the server always sets it.

Alternative: add `"no-contest"` to the history result union. Clients that switch on the result would break, and the shape must stay stable. Rejected.

### 4. Queue cleanup and expiry

New `convex/models/pairings/queue.ts` holds `pairingByUser(ctx, userId)` and `leaveQueue(ctx, userId)`. It imports only `_generated`. `rooms/index.ts` can't import `pairings/index.ts`, because `pairings/index.ts` already imports `rooms/index.ts` and both define validators. `queue.ts` sits outside that cycle, as `rooms/auth.ts` does for rooms.

- `create` calls `leaveQueue` right after `requireUser`. Both of its paths leave the caller with an active room.
- `join` calls it on the redirect and new-seat paths only. The existing-seat path is the game page opening any room the user ever sat in, including old closed ones from history. Clearing the queue there would cancel a live search.
- `enqueue` calls it when it returns the caller's active room. It deletes the caller's own expired entry before searching. It walks `byType` entries oldest first, skipping expired ones and deleting entries whose user is missing or has `getActiveRoomForUser`. It pairs with the first valid entry, or queues the caller.
- `pairings.sweep` sets `expiredAt` on entries past `QUEUE_ENTRY_TIMEOUT_MS`, and deletes entries expired for longer than a new `EXPIRED_RETENTION_MS` of 60 minutes.
- `status` returns `entry !== null && entry.expiredAt === undefined`. The new `expired` query returns `entry?.expiredAt !== undefined`.

Alternative: change `status` to return `"waiting" | "expired" | null`. That breaks the boolean that `polish-new-game`'s `playView` reads. Rejected in favor of a separate query.

### 5. Room lookups

- `getRoomByCode` queries `byCode` with `code.trim().toUpperCase()`. Codes are generated from an uppercase alphabet, so stored rows already match. Every caller gets the fix, including `cursors`, `players`, and `games`.
- `getGame` falls back to `getCurrentGame` when the requested round has no row. `rooms.get` already compares `game._id` with the live game, so `isLive` and `latestRound` come out right with no other change. `games.history` gets the same fallback, so its scrubber stays in step with `get`.

Alternative: return `game: null` for a future round. That changes `rooms.get`'s type, which `RoomSnapshot` and every `Room` getter read without a null check. Rejected.

### 6. Rematch round guard

`rematch` args become `{ code, round: v.optional(v.number()) }`. After `requirePlayer`, if `round` is given and `getCurrentGame(...).round !== round`, it returns. The argument is optional so today's `room.svelte.ts` call keeps compiling. Passing `this.game.round` from the client is a one-line follow-up in whichever change owns `room.svelte.ts`. Until then, the server still blocks a double credit (Decision 1), and only the misleading error remains.

### 7. Trashtalk allow-list

`players/index.ts` exports `TRASHTALK_EMOJIS`: `DEFAULT_EMOJI` plus the ten codepoints in `EMOJI_OPTIONS` (`src/lib/components/layout/board/board.svelte`). The `emoji` validator stays `v.string()`. The handler checks list membership, because a union of literals would put the list in the generated API types for little gain. Order: room lookup, `requirePlayer`, `isRoomActive` and `leftAt` checks ("This room is no longer active"), then the emoji check ("Unknown emoji").

### 8. Cursor gating with `rooms.active`

`CursorPresence` subscribes to `api.models.rooms.index.active`, which needs no arguments. The viewer is seated in an active room exactly when that result's `code` equals `getCode().toUpperCase()`. `getActiveRoomForUser` already requires `leftAt` to be unset and the room to be active. A signed-out viewer makes the query throw, so `data` stays undefined and nothing is sent. A private `#hasSent` flag is set by a sent update and cleared by a clear. `leave()` and `dispose()` call `clear` only when it is set.

Alternatives:

- _A new `isSeated` prop on `Cursor`._ The callers (`tictactoe.svelte`, `checkers.svelte`) belong to other changes, and a default of `true` would leave the bug in place. Rejected.
- _Subscribing to `rooms.get`._ It is heavier (clocks, results, players), and a pinned round gives it different arguments from `Room`'s subscription. Rejected.
- _A new `cursors.canSend` query._ It adds API surface when an existing query already answers the question. Rejected.

## Trust boundary

- **Authenticated:** every mutation still starts with `requireUser`, directly or through `requirePlayer`. `settleRound`, `leaveQueue`, and `pairingByUser` are plain functions, not endpoints. A client can reach them only through mutations that have already authenticated and authorized. `sweep` stays internal.
- **Room membership:** `play`, `resign`, `rematch`, `abandon`, and `trashtalk` use `requirePlayer` for the room resolved from the normalized code. `trashtalk` now also requires an active room and `leftAt` unset. `timeout` stays callable by any signed-in user (spectator claims are by design). It can only settle a round whose server-side elapsed time is up.
- **Re-derived on the server:** settlement takes the winner only from persisted `results.state` and the engine's `gameStatus`/`roundWinner`, never from arguments. `rematch`'s `round` can only turn a call into a no-op, never pick which round is settled or credited. `pairings.expired` reads only the caller's own row. `trashtalk` checks the emoji against a server list before it ever reaches an opponent's Lottie URL.
- **New write paths:** score and MMR writes move from `rematch` to `play`, `resign`, `timeout`, `abandon`, and `sweep`. Each one runs only after the server has decided the round is over. The `settledAt` check keeps a client from triggering a second credit by repeating any of them.

## Risks / Trade-offs

- [Old rounds that ended (resign, timeout, or a won board) but were never rematched] → they settle on the next `rematch`, `abandon`, or `sweep`, and the read side classifies them correctly.
- [`rooms.history` returns fewer rows than before] → only no-contest rounds disappear. Changes C and D already handle a room with fewer rounds, and the shape doesn't change.
- [A seated player whose `active` query is still loading can't send a cursor for a moment] → the effect is cosmetic and clears once the query loads.
- [`TRASHTALK_EMOJIS` and `EMOJI_OPTIONS` can drift] → a follow-up for the `board.svelte` owner is to build `EMOJI_OPTIONS` from the server list. Until then, a picker option missing from the server list fails visibly with "Unknown emoji".
- [The `enqueue` walk can touch several entries in one mutation] → each stale entry it meets is deleted, so the walk shortens over time. Indexes (B12) are out of scope.
- [The B1 fix depends on uncommitted `add-optimistic-moves` work] → commit that change first, or ship both together.

## Migration Plan

Every new field is optional, so the schema deploys with no backfill. Old rows are handled on read (Decision 3) and on the next `rematch` (Decision 2). To roll back, revert the code. The new optional fields can stay on rows, because the old code ignores them.

## Open Questions

- Should the steward record "rounds settle when they end" as a decision in `references/decisions.md` and update backend.md's "Round outcomes ... re-derived server-side (`rematch`, ...)" line? Assumed yes, in the knowledge-sync step.
