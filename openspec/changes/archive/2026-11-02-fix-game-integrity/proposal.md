# Proposal

## Why

The code-traced bug hunt found server bugs that corrupt scores, ratings, history, and the matchmaking queue. Wins are credited only when someone presses Rematch. Rounds that end any other way keep no score, or stay "Playing" forever. A matched player can be seated in two rooms at once. A host can move before anyone joins. Each bug is re-verified against the current code in design.md.

## What Changes

- Add `settleRound` in `convex/models/games/index.ts`. It runs once when a round ends: `play` (board over), `resign`, `timeout`, `abandon`, and both `sweep` paths. It stops the clocks, then credits the score and MMR once, or marks the round no-contest. `rematch` only creates the next round. It calls `settleRound` only to settle a round that ended before this change and was never settled (B2, B3, B21).
- A round that ends with an empty seat, or when every seat goes idle, is no-contest. It changes no score or rating, and `rooms.history` and `rooms.stats` leave it out (B4). History keeps its current shape: a no-contest round is missing from a room's `games`, and a room with no other rounds is missing from the list.
- `rooms.create`, `rooms.join`, and a match from `pairings.enqueue` delete the caller's queue entry. `enqueue` skips and deletes waiting entries whose user already has an active room or no longer exists (B5).
- `pairings.sweep` marks a stale entry expired instead of deleting it. `pairings.status` stays a boolean and is false for an expired entry. A new query, `pairings.expired`, tells the client the search expired (B17, server half).
- Each `rooms.history` round gains an optional `reason` (`"timeout" | "resign" | "abandon" | null`) from how the round ended. Change C displays it.
- `rooms.play` and `games.resign` throw "Waiting for opponent" while a seat is empty (B6).
- `players.trashtalk` accepts only the allowed emoji list and only from a player still in an active room (B9).
- `rooms.get` and `games.history` fall back to the live round for a round that doesn't exist, instead of returning nothing (B13).
- Room codes are case-insensitive in `getRoomByCode`, so `join`, `get`, `play`, and every other lookup accept them (B19).
- `rooms.rematch` takes an optional `round`. It is a no-op when the room has already moved past that round (B20).
- `CursorPresence` sends cursor updates only while the viewer is seated in an active room, and clears only a cursor it has sent (B16).
- B1 (checkers timeout loop when signed out or the room is missing) is already fixed by `Room`'s concrete `activeSeat`. No task.

Out of scope: B7 clock skew, B10/B18/B24 (game-room client), B12 indexes, B15 the crowning rule, B22, B23, the client half of B5 (change `polish-new-game`), passing `round` to `rematch` from `room.svelte.ts`, showing "search expired" in /play, rate limiting, and splitting `rooms/index.ts`.

## Capabilities

### New Capabilities

- `round-settlement`: When a round counts as ended, how its score and rating are settled exactly once, and how no-contest rounds are left out of history and stats.
- `matchmaking`: The quick-match queue: who can be paired, when an entry is removed, and how expiry is reported.
- `room-play`: Room lookup and round progression on the server: case-insensitive codes, moves gated on a full room, round lookup fallback, and idempotent rematch.
- `trashtalk`: Which emoji a player can set and when.
- `cursor-presence`: When the client sends and clears the viewer's live cursor.

### Modified Capabilities

None.

## Impact

- **Schema (optional fields, no migration):** `games.settledAt?: number`, `games.isNoContest?: boolean`, `pairings.expiredAt?: number`.
- **New public Convex function:** `pairings.expired` (query, `requireUser`, reads only the caller's row).
- **Changed public signatures, compatible:** `rooms.rematch` gains optional `round`. Every query keeps its return shape. `rooms.history` rounds only gain the optional `reason` field. `rooms.history` may return fewer rounds or rooms (no-contest left out). `pairings.status` is false for an expired entry.
- **Trust boundary:** no mutation loses `ctx.auth` or its membership check. `trashtalk` gains an active-seat check. Settlement moves from `rematch` to every round-ending mutation, so scores and MMR are written in more places, all server-derived.
- **Code:** `convex/models/games/{index.ts,schema.ts}`, `convex/models/rooms/{index.ts,auth.ts}`, `convex/models/pairings/{index.ts,schema.ts,queue.ts}` (new), `convex/models/players/index.ts`, `src/lib/features/presence/cursor/cursor.svelte.ts`, and their tests.
- **Other changes:** `polish-new-game` (B) can read `pairings.expired`. Its "Cancel room" abandon becomes no-contest instead of a loss. `.agents/skills/twoplay/references/backend.md` needs the new fields, `pairings.expired`, and settlement moving out of `rematch` (steward).
- **Security review** is required: scoring and rating writes, a new public query, and a changed validator.
