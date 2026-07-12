---
name: twoplay-database
description:
  Reference for twoplay's Convex backend — schema/table shapes, the
  models/<name>/{schema,index,engine,rules}.ts organization, authorization
  pattern (requirePlayer), and trust-boundary rules. Use when writing a Convex
  mutation/query, changing the schema, or reasoning about what the server
  must validate versus what the client can be trusted for.
---

# twoplay Database & Backend

Convex backend under `convex/`. This skill covers the data model and backend conventions; for the
client-side game/Room pattern that consumes it see `twoplay-game`; for authorization/hardening
depth see the `security` agent.

## Folder organization

`convex/` root holds only wiring: `schema.ts` (assembles the schema from each model), `auth.config.ts`
(Clerk JWT provider config). All domain logic lives under `convex/models/<name>/`, with a consistent
per-model shape:

- **`schema.ts`** — one `defineTable({...})` const named `<name>Table`, built from `v.*`
  validators, with `.index(...)` calls chained on. Pure data-shape definition, no logic.
- **`index.ts`** — the model's public surface: `query`/`mutation` exports (named after the
  operation: `create`, `join`, `get`, `play`, `newGame`, `history`, `store`, `update`, `clear`,
  `list`), plus plain exported helper functions other models import (`rooms/index.ts` exports
  `requirePlayer`/`getRoomByCode`, reused by `cursors/index.ts`).

Not every model needs the full pair — `moves` has only `schema.ts`; its rows are read/written
directly by `rooms`, so there's no standalone moves API.

The `games` model is polymorphic across game types and has an extra layer — see `twoplay-game` for
the full `schema.ts`/`rules.ts`/`engine.ts` split per game type, and the registry/dispatch pattern
in `convex/models/games/index.ts`.

## Schema — six tables

Assembled in `convex/schema.ts`:

- **`users`**: `name`, `clerk__userId`; index `byClerkUserId`. Maps a Clerk identity to an app user.
- **`players`**: `userId: Id<"users">`, `name`; index `byUserId`. Game data references `players`,
  never `users`, directly.
- **`rooms`**: `code`, `name: gameTypeValidator`, `players: Id<"players">[]` (array index = seat),
  `scores?: number[]`; index `byCode`. Lobby state only — one room can span many rounds/games.
- **`games`**: `roomId: Id<"rooms">`, `round: number`, `state: gameStateValidator`; index
  `byRoom(["roomId","round"])`. One row per round; "current" = highest `round` for that `roomId`.
- **`moves`**: `gameId: Id<"games">`, `index`, `player: Id<"players">`, `state:
  gameStateValidator` (post-move snapshot); index `byGame(["gameId","index"])`. Full replay
  history.
- **`cursors`**: `roomId`, `playerId`, `x`/`y` (normalized 0-1), `updatedAt`; indexes `byRoom` and
  `byRoomAndPlayer`. Live pointer broadcast, one row per player per room.

**Discriminated unions**: `gameTypeValidator = v.union(v.literal("tictactoe"), v.literal("checkers"))`,
`gameStateValidator`/`gameMoveValidator` are unions of each game's `v.object`, each carrying its own
`kind: v.literal(...)` tag for runtime narrowing. Convex does not enforce referential integrity on
`Id<...>` fields automatically — fine today since there are no delete mutations for `players`/`rooms`/
`users`; check every table with a foreign-key reference before adding one.

Every new query/mutation argument should use the narrowest `v.*` validator available — Convex
rejects malformed payloads before the handler runs, but only for the shape you declared.

## Authorization — the two-layer check

All access funnels through `requirePlayer` (`convex/models/rooms/index.ts`):

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Sign in to play");
const user = await userByClerkUserId(ctx, identity.subject);
const player = await playerByUserId(ctx, user._id);
```

1. **Authenticate**: `ctx.auth.getUserIdentity()` is the only sanctioned way to identify a caller —
   never trust a client-submitted `playerId`/`userId` as identity.
2. **Authorize against the specific resource**: every mutation/query additionally checks room
   membership explicitly (`room.players.includes(player._id)` / `playerIndex !== -1`) — being a
   known signed-in player does not imply being allowed to act on a given room. There is no
   middleware doing this automatically; a new mutation touching room/game/move/cursor data must
   repeat both checks itself.

`auth.config.ts` wires `identity.subject` to Clerk via `CLERK_FRONTEND_API_URL` /
`applicationID: "convex"`.

## Trust-boundary rules — server is the sole authority

- **Re-validate legality server-side, always.** Both engines' `applyMove` independently re-derive
  whose turn it is and what's legal — tictactoe throws `"Not your turn"` on a turn-order mismatch,
  checkers only accepts a move matching its own server-computed `computeLegalMoves` set (enforcing
  mandatory-capture rules too). The client's move is a *proposal*, never evidence of legality.
- **Guard discriminated-union kind mismatches at the entry point.** The `play` mutation checks
  `move.kind !== room.name` before dispatch; the registry's switch-dispatched `applyMove` throws if
  `state.kind`/`move.kind` don't match the case — defense against a payload smuggling a move meant
  for a different game.
- **Re-derive round/score outcomes server-side.** `newGame` re-checks `gameStatus(...).isOver` and
  computes `roundWinner` itself before incrementing scores — enforced here, not just by disabling a
  button client-side, so a direct mutation call can't dodge a loss.
- **Bound free-text input.** `users.store` trims and caps names at `MAX_NAME_LENGTH = 100` and
  rejects empty names — no other content/XSS filtering exists, relies on the frontend escaping on
  render.
- **Room capacity enforced server-side**: `join` throws `"Room is full"` once
  `room.players.length >= engine.playerCount`.

## Known gaps — treat as live constraints, not fixed facts

- **No rate limiting anywhere** — no cooldown on `play`, `cursors.update`, or `rooms.create`. Any
  change touching these should consider whether it makes spam cheaper.
- **Room codes use `Math.random()`** (6-char, ambiguity-free alphabet excluding 0/O/1/I/L, 10
  collision-retry attempts) — non-cryptographic, acceptable only because a room code is a shareable
  lobby code, never treated as proof of authorization on its own (that's always `requirePlayer` +
  membership).
- **Auth guarding on routes is client-side only** — no `+page.server.ts` redirect gates signed-out
  users; `Lobby`/home page swap in a "sign in" CTA instead. This is acceptable only because Convex's
  `requirePlayer` is the real boundary — never rely on a route-level check alone.

For implementing fixes to any of the above, or auditing a new mutation against these rules in depth,
use the `security` agent.
