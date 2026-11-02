# Backend — Convex data model, auth, trust boundaries

## Organization
`convex/` root is wiring only: `schema.ts` (assembles tables), `auth.config.ts` (Clerk JWT,
`CLERK_FRONTEND_API_URL`, `applicationID: "convex"`), `crons.ts` (scheduled sweeps).
Domain logic is in `convex/models/<name>/`:
- `schema.ts` — one `<name>Table = defineTable({...})` with `.index(...)`. No logic.
- `index.ts` — the public `query`/`mutation`/`internalMutation` exports plus helpers other models import.
- `moves` has only `schema.ts` (written by `rooms.play`, read by `games`).
- `pairings/queue.ts` holds `pairingByUser` and `leaveQueue`, so `rooms` can use them without importing `pairings/index.ts`.
- `rooms/auth.ts` holds auth and lookup helpers. It's split out to avoid circular imports, because
  `mutation({ args })` validators evaluate eagerly at module load.
- Client code value-imports only `_generated/api`, `models/*/constants.ts`, and
  `models/games/<game>/{index,rules}.ts`, enforced by `convex/client-boundary.test.ts`.

## Tables (`convex/schema.ts`)
| Table | Shape (key fields) | Indexes |
|---|---|---|
| users | `name`, `clerk__userId` | byClerkUserId |
| players | one row **per user per room**: `userId`, `roomId`, `name` (snapshot), `score`, `emoji`, `leftAt?`, `seenAt?` | byUserAndRoom, byUser |
| rooms | `code`, `type` (game type), `players: Id<"players">[]` (index = seat), `time?`, `visibility?`, `status?` (`active`/`closed`), `closedAt?`, `reason?` | byCode, byVisibility, byStatus |
| games | `roomId`, `round`, `state` (union), `settledAt?`, `isNoContest?` — current = highest round | byRoom(roomId, round) |
| clocks | per player per game: `remaining`, `turnedAt?` | byGame, byGameAndPlayer |
| moves | `gameId`, `turn`, `playerId`, `state` (post-move snapshot) | byGame(gameId, turn) |
| results | per player per game: `state?` (`timeout`/`resign`/`abandon`), `mmr?` | byGame, byGameAndPlayer |
| ratings | one per user: `rating` | byUser, byRating |
| pairings | quick-match queue: `userId`, `type`, `time`, `expiredAt?` (deleted on pair) | byUser, byType |
| cursors | `roomId`, `playerId`, `x`/`y` (0–1), `updatedAt` | byRoom, byRoomAndPlayer |

Optional fields with "legacy" defaults exist because old rows predate them. Keep new fields optional
or write a migration. Convex doesn't enforce `Id<>` integrity, so check references before adding deletes.

## Public API surface (as of 2026-11-02)
- rooms: `create`, `join`, `active`, `get`, `play`, `rematch`, `abandon`, `history`, `stats`,
  `statsForUsers`, `lobbies`; internal `sweep`.
- players: `trashtalk`, `heartbeat`. ratings: `mine`, `top`. pairings: `enqueue`, `cancel`,
  `status`, `expired`; internal `sweep`. users: `store`. cursors: `update`, `clear`, `list`. games: history/registry.

## Authorization: two layers, repeated in every handler
Use the helpers in `convex/models/rooms/auth.ts`:
- `requireUser(ctx)` — authenticates via `ctx.auth.getUserIdentity()` → users row. Throws `"Sign in to play"`.
- `currentPlayer(ctx, roomId)` — the caller's player row in that room, or `null` for a spectator.
- `requirePlayer(ctx, roomId)` — throws unless the caller is seated in that room.
- `getRoomByCode` (case-insensitive: `code.trim().toUpperCase()`), `isRoomActive`, `getActiveRoomForUser` (one active room per user).

Rules:
1. Identity comes **only** from `ctx.auth`. Never trust a client-sent `userId`/`playerId`.
2. Being signed in ≠ allowed to act on a room. Every room/game/move/cursor mutation must check seat
   membership itself. No middleware does it for you.
3. Reads may be spectator-visible (`currentPlayer` → null) — that is a deliberate feature; writes are not.

## Trust boundary — the server decides
- Engines' `applyMove` re-derive turn order and legality (`"Not your turn"`, checkers only accepts
  moves in its own `computeLegalMoves`). The client move is only a proposal.
- `play` rejects `move.kind !== room.type` before dispatch; registry switches throw on kind mismatch.
- `play` and `resign` throw `"Waiting for opponent"` until the room has `getEngine(type).playerCount` seats.
- `trashtalk` accepts only `TRASHTALK_EMOJIS` (`players/constants.ts`), from a seated, unleft player in an active room.
- Round outcomes, scores, MMR, timeouts are re-derived server-side (`settleRound`, `timeout`, results).
- Bound all input with the narrowest `v.*` validator; clamp numbers server-side
  (`resolveTimeControlMs` clamps to 10s–60min); trim and cap free text (`users.store` caps names at 100).
- Remember Convex rolls back **all** writes in a handler that throws, so never write then throw.

## Round settlement
`settleRound(ctx, room, game, { shouldVoidIfUnfinished? })` (`games/index.ts`) credits score, rating, and
`results.mmr` when a round ends. Callers: `play` (board over), `resign`, `timeout`, `rematch`, `abandon`, `sweep`.
- Idempotent: returns early once `settledAt` is set.
- Stops every running clock (`remaining` banked, `turnedAt` unset).
- `isNoContest: true` when a seat is empty, or when the round is unfinished and `shouldVoidIfUnfinished`
  is set (the all-idle `sweep` branch). No-contest credits nobody.
- `rematch({ code, round? })` returns early when `round` isn't the live round, so a second press is a no-op.

## History and stats
`classifyGameResult` (`rooms/index.ts`) returns an internal `"no-contest"` for `isNoContest` rounds,
for an unfinished round in a closed room, and for a finished round short a seat. `history` drops these and
`computePlayerStats` skips them. `GameHistoryEntry.reason` is the round's `results.state`
(`timeout`/`resign`/`abandon`) or `null` for a board result.

## Matchmaking queue (`pairings`)
- `create`, `join` (new seat or redirect), and `enqueue` (when the caller already has an active room) call `leaveQueue`.
- `enqueue` walks unexpired `byType` entries oldest first, deleting each one it visits; entries whose user is
  missing or already in an active room are skipped.
- `sweep` sets `expiredAt` after 5 min, then deletes the entry 60 min later (`EXPIRED_RETENTION_MS`).
- `status` ignores expired entries; `expired` tells the caller their own entry expired.

## Known gaps (still true)
- No rate limiting anywhere (`play`, `cursors.update`, `rooms.create`, `trashtalk`, `pairings.enqueue`).
  Any change that makes spam cheaper should say so.
- Room codes use `Math.random()` (6 chars, unambiguous alphabet). Acceptable only because a code is
  never authorization by itself.
- Route guarding is client-side only. Convex is the real boundary.
