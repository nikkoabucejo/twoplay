# Design

## Context

`settleRound` (`convex/models/games/index.ts`) banks `remaining - (now - turnedAt)` for each running clock and clears `turnedAt`. It skips clocks whose `turnedAt` is already undefined. `resign`, `forfeitRoom`, and the empty-room branch of `sweep` clear the caller's `turnedAt` first, so `settleRound` skips that clock and the turn's elapsed time is lost. Moves (`play`) and timeouts (`claimExpiredClock`) bank time correctly.

## Goals / Non-Goals

**Goals:** a seat that resigns or abandons on its own turn keeps its remaining time as of that moment.

**Non-Goals:** treating a resign on an already-expired clock as a timeout. `settleRound` clamps at 0, so the clock shows 0:00 and the cause stays "resign".

## Decisions

**Delete the premature `turnedAt: undefined` patches; leave `settleRound` unchanged.**

- Alternative: compute and bank the elapsed time in each caller before marking the round ended. Rejected: duplicates `settleRound`'s arithmetic in three places.
- Chosen: one place stops and banks clocks. Each caller already runs `settleRound` right after `markEnded` in the same transaction.

**Unaffected callers**

- `resign`: no server callers. The client's `Room::resign` sends the same args and gets the same return, so it is unaffected.
- `abandon`: calls `forfeitRoom`; same args and return, so it is unaffected apart from the fixed clock.
- `sweep` full-room branches: call `forfeitRoom` or `settleRound`; unaffected beyond the same fix.
- `sweep` empty-room branch: a room's clock starts only when the second seat joins (`join`), and a seat leaving closes the room, so an active room with an empty seat has no running clock. Removing the patch there is a no-op kept for consistency.
- Other `settleRound` callers (`play`, `timeout`, `rematch`): unaffected because `settleRound` is unchanged.

## Trust boundary

- `resign` still authenticates via `requirePlayer` (signed-in caller seated in the room) and checks the room is active and full.
- `abandon` still authenticates via `requirePlayer`.
- `sweep` is an `internalMutation`, not callable by clients.
- Elapsed time is computed server-side from `Date.now()` and the stored `turnedAt`; no client time is trusted.

## Risks / Trade-offs

- [A client that rendered the frozen pre-fix value sees a lower clock after settle] → intended; it now matches the time used.
- [Realtime: the settled clock is written in the same transaction as the result] → clients receive one consistent update, as before.
