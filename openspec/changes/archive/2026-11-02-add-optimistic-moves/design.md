# Design

## Context

See proposal.md for why. The current state:

- `Room` (`src/lib/utils/multiplayer/room/room.svelte.ts`) subscribes to `rooms.get` and `games.history`. `submitMove` awaits `rooms.play` and writes a failure into `error`. `displayState` is the server state or the history snapshot under `#cursor`.
- `activeSeat` is abstract in `Room`. Each subclass derives it from its own copy of the server state: `TictactoeRoom` uses `#state`, `#liveBoards`, `#liveBoardStatuses`, `#liveMetaStatus`, `#liveIsOver`, and `#liveTurn`. `CheckersRoom` uses `#state`, `#liveTurn`, `#liveLegalMoves`, and `#liveWinner`. `isMyTurn`, `clock.activeSeat`, `#liveRemaining`, and the timeout auto-claim `$effect` (room.svelte.ts:87) all read `activeSeat`.
- `rooms.play` (convex/models/rooms/index.ts:248) returns nothing. It throws on a missing room, an inactive room, a non-member, a kind mismatch, a finished round, "Time's up", or an engine error such as "Not your turn". It returns early with no write when `applyMove` returns the same state object.
- Both engines are pure, and the client can import them: `tictactoeEngine` and `checkersEngine` from `convex/models/games/{tictactoe,checkers}/engine.ts`. Their `status(state)` gives `turnIndex` and `isOver`, which matches what the subclasses' `#live*` chains compute by hand.
- `rooms.get` re-pushes on every write to the room, including the heartbeat `seenAt` update every 15 s. A new snapshot therefore does not mean the game state changed.
- In tic-tac-toe, the move sound plays from the mark's `liquidIn` intro (tictactoe.svelte:22). The mark sits in `{#each cells as cell, cellIndex (cellIndex)}` under `{#if cell}`. Checkers plays the sound on click (checkers.svelte:98). Its piece is keyed by `{#key pieceKey(index, cell)}`, which is `index:color:rank`.
- In production, Convex redacts the messages of plain `Error`s thrown by mutations, so the client cannot show the server's reason reliably.

## Goals / Non-Goals

**Goals:**

- One prediction mechanism in `Room`, shared by both games, with each subclass contributing only its engine.
- The predicted position, the turn, and the clock change in the same frame as the click. Confirmation causes no flicker, remount, or second sound.
- Every server-authority path (the timeout claim, the turn alert) keeps reading server values only.

**Non-Goals:**

- Reconciling the opponent's moves, which arrive only from the server.
- Making `play` round-aware or idempotent. That needs a Convex change (see Risks).

## Decisions

### D1. A pending queue in `Room`, not convex-svelte `optimisticUpdate`

`Room` gets a private queue:

```ts
type PendingMove = {
	id: number;          // monotonically increasing per Room
	round: number;       // data.game.round when queued
	seat: 0 | 1;         // myIndex when queued
	move: GameMove;
	predicted: GameState; // live state right after this move, at queue time
	queuedAt: number;     // Date.now() at click, for the clock handoff
	handoff: { frozen: [number, number] } | null; // set when this move passes the turn
};
#pending = $state<PendingMove[]>([]);
```

`submitMove(move)` does the following, synchronously and before awaiting:

1. Compute `predicted = engine.applyMove(liveState, myIndex, move)`. If it throws or returns the same state, fall through to the plain request with no prediction.
2. Push the entry.
3. Call `#play`.

On resolve or reject, it settles the entry by `id` (D3, D4).

Alternative rejected: convex-svelte's `useMutation(...).withOptimisticUpdate` with `localStore.setQuery(rooms.get, ...)`.

- It rewrites the whole `rooms.get` result, so it would also have to fake `clock.turnedAt`. That predicted clock would then reach the timeout `$effect`, because that effect reads the same query.
- Convex drops the optimistic update when the mutation settles, not when we choose. So we cannot tell a rejection (shake, toast) from a confirmation without separate local state anyway.
- It is keyed by query arguments. A pinned `round` argument would need the store patched for every `{code, round}` variant.
- The fake-convex test mock has no `localStore`, so every test would need a new mock surface.

A queue in `Room` is plain runes, can be tested with the existing mock, and keeps a confirmed view next to the predicted one.

### D2. Composing the live state

Each subclass passes a client engine to `Room`:

```ts
type ClientEngine = {
	applyMove(state: GameState, seat: 0 | 1, move: GameMove): GameState; // throws like the server
	status(state: GameState): { turnIndex: number; isOver: boolean };
};
// TictactoeRoom: super("tictactoe", tictactoeClientEngine, getCode, getRound)
```

Each adapter narrows `state.kind` and `move.kind` and delegates to `tictactoeEngine` or `checkersEngine`. `Room` adds:

- `#serverState = $derived(this.data?.game.state ?? null)`
- `#confirmedCount`: how many leading queue entries the server already reflects. It is the index of the last entry whose `predicted` structurally equals `#serverState`, plus 1, or 0. Equality is a small `isSameState` helper that compares the JSON of the boards: at most 81 cells, checked only while something is pending.
- `protected liveState = $derived(...)`: `#serverState`, then each entry after `#confirmedCount` folded in with `engine.applyMove`. Only entries whose `round` equals `game.round` are folded. The fold stops at the first entry that throws or returns the same state, and later entries depend on that one, so they are skipped too. While the round is not live (`!game.isLive`), `liveState` is `#serverState`.

Which getters switch to predicted, and which stay on the server:

| Getter                                     | Reads                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `Room.displayState`                        | `liveState` when `#cursor === null`; the history snapshot otherwise (pending ignored) |
| `Room.activeSeat` (now concrete in `Room`) | `seatOf(liveState)`                                                                   |
| `Room.isMyTurn`                            | `activeSeat`, so predicted                                                            |
| `Room.clock.activeSeat`                    | `activeSeat`, so predicted                                                            |
| new `Room.isMyTurnConfirmed`               | `seatOf(#serverState) === myIndex`, plus the existing seat and waiting checks         |
| `#confirmedActiveSeat` (private)           | `seatOf(#serverState)`                                                                |
| timeout auto-claim `$effect`               | `#confirmedActiveSeat` and `#serverRemaining`                                         |
| `TurnAlert` at both call sites             | `room.isMyTurnConfirmed`                                                              |

`seatOf(state)` is `game.isLive && game.endedSeat === null && state !== null && !engine.status(state).isOver ? engine.status(state).turnIndex : null`. This replaces both subclasses' `override activeSeat`, together with the private chains that only fed it:

- `TictactoeRoom`: `#state`, `#liveBoards`, `#liveBoardStatuses`, `#liveMetaStatus`, `#liveIsOver`, `#liveTurn`
- `CheckersRoom`: `#state`, `#liveTurn`, `#liveLegalMoves`, `#liveWinner`

Their public getters (`boards`, `turn`, `board`, `mustContinueFrom`, `legalMoves`, `winner`, and others) already read `displayState`, so they follow the prediction with no change. `canPlay` and `canMove` already gate on `isViewingHistory` and on the turn, so after a pending tic-tac-toe move both stay false until the opponent moves.

Alternative rejected: keeping `activeSeat` abstract and adding an abstract `confirmedActiveSeat` to each subclass. That duplicates the turn logic four times, where `engine.status` already gives it.

### D3. Confirm rule

A pending entry is confirmed by whichever happens first:

1. **The state matches.** `#serverState` structurally equals the entry's `predicted`. `#confirmedCount` covers this inside the derivation, so the frame where the server state arrives renders exactly the same position as the frame before it.
2. **The request resolves.** `#play` resolves, and the entry with that `id` is removed from `#pending`. The Convex client resolves a mutation only after the query results that include its write have been applied, so by then the server state already shows the move.

Housekeeping: when `#confirmedCount > 0`, an `$effect` splices the confirmed entries out of `#pending`. This is not needed for correctness, because the derivation already skips them.

Cases:

- **No-op result.** `play` returns early when `nextState === state`, so the server state never equals `predicted`. Rule 2 removes the entry, and the fold reverts to the server state. There is no toast and no `error`, which matches the spec scenario "No-op result".
- **Duplicate snapshot.** A heartbeat re-push brings an unchanged game state. It does not equal `predicted` and nothing resolved, so the queue is untouched and `liveState` is the same fold. No flicker.
- **The move count was rejected as the key.** The room query has no move count. Tic-tac-toe can derive one from the filled cells, but checkers cannot: a simple move keeps the piece count. Using history length would couple two subscriptions. Comparing state is exact for both games.

### D4. Rejection flow

When `#play` rejects with entry `id`:

1. Find the entry's index. If it is already gone (a new round dropped it), stop.
2. Remove it and every entry after it (`#pending = #pending.slice(0, index)`). Requests already sent for the tail may still resolve or reject. Their `id`s are no longer in the queue, so they settle without effect, and no extra toasts appear.
3. Set `rejection = { id, message: "Move not accepted" }`. This is public `$state` that is replaced on each rejection. It does not write `error`.

The fixed copy avoids showing redacted production messages such as "Server Error".

Consumers:

- **Toast.** `tictactoe.svelte` and `checkers.svelte` call `getToaster()` and run `$effect(() => { if (room.rejection) toaster.show(room.rejection.message, { tone: "error" }) })`. The effect re-runs per new object, so there is one toast per rejection.
- **Shake.** `Board` (`components/layout/board/board.svelte`) gets an optional `rejectionId?: number | null` prop. When it changes to a new non-null value, `Board` runs `boardElement.animate([...translateX keyframes], { duration: 300 })` on the square board container, unless `matchMedia("(prefers-reduced-motion: reduce)").matches`. The Web Animations API restarts cleanly on each rejection without class toggling, and touches only `transform`, so no layout shift.
- **Room stays toaster-free.** `getToaster()` needs component context, and `Room` is also constructed by `Playing` and in plain unit tests.

### D5. Clock handoff

When `submitMove` queues an entry whose `predicted` passes the turn (the turn index differs from the one before it), it records:

- `handoff.frozen = #serverRemaining` sampled at `queuedAt`, using `Date.now()`, not the 1 s `#now`.

The display value `#liveRemaining` is then:

- With no pending handoff entry (after the fold), it is the existing formula over the server's `remaining` and `turnedAt`, which is the same as `#serverRemaining`.
- With the first pending handoff entry `h`, the viewer's seat is `h.handoff.frozen[mySeat]`, and the opponent's seat is `max(0, frozen[opp] - (now - h.queuedAt))`.

When the server confirms, the entry leaves the fold and the server values take over. The opponent's server `turnedAt` is stamped at commit, so their clock can step up by about one round trip. That is acceptable, and the spec only requires the server values to replace both.

`#serverRemaining` is the existing formula keyed to `#confirmedActiveSeat`. The auto-claim `$effect` switches to `#confirmedActiveSeat` and `#serverRemaining`. A predicted opponent clock reaching zero therefore never claims. While a move is pending, the viewer's own server-side clock keeps running for the claim exactly as it does today, and the server re-checks `turnedAt` in both `play` and `timeout`.

The scrub freeze (`#frozenRemaining`, `isClockDisplayFrozen`) is unchanged and snapshots `#liveRemaining`.

### D6. Checkers chaining

This needs no special code path. After a predicted capture, `liveState.mustContinueFrom` is set and `turn` is still the viewer's. So the following hold:

- `activeSeat === myIndex`
- `canMove` is true
- `effectiveSelected === mustContinueFrom`
- `legalMoves` offers only the continuation

`select` then calls `submitMove` again, which predicts on top of the first entry. The Convex client sends mutations from one client in order, and the server runs them in that order, so the second request sees the first one's result. If the first is rejected, D4 drops the second from the queue. The server then finds no piece on the second move's `from` square, `applyMove` returns the same state, and the request is a no-op.

`CheckersRoom.select` keeps `await this.submitMove(...)`, but `submitMove` queues before its first `await`, so the UI updates on the click.

### D7. Tic-tac-toe sound and no remount

The cell's `{#each ... (cellIndex)}` key and `{#if cell}` already give stable identity: the mark element exists for as long as `cell` is non-null. D3 keeps `cell` non-null across the confirming frame, so `liquidIn` and its `playMoveSound` run once, on the predicted frame.

The checkers `{#key pieceKey(index, cell)}` is likewise unchanged on confirm, because color and rank match.

No markup change is needed for either game. The tests in D10 lock this behavior in.

### D8. Scrub interaction

- `displayState` ignores `#pending` whenever `#cursor !== null`.
- `canPlay` and `canMove` already block moves while scrubbing.
- `#historyMoves` stays server-only, so `historyLength`, `stepForward`, and the "history emptied → back to live" `$effect` are unaffected.
- Returning to live shows the fold again.

### D9. Rollback point on a new round or rematch

Entries carry `round`.

- When `data.game.round` differs from an entry's `round`, the fold ignores that entry, and an `$effect` drops it from `#pending` without a toast.
- `rematch()` clears `#pending` along with `#cursor`.
- If the old round's request later rejects ("This round is already over"), its `id` is gone and D4 step 1 makes it silent.
- When `endedSeat` turns non-null mid-flight (the opponent resigned or abandoned), the prediction stays until the server rejects the move, and then the spec's toast and shake run. Meanwhile `seatOf` already returns null, because it checks `endedSeat`.

### D10. Test strategy

All tests run in Vitest with `fake-convex.svelte.ts`. `mutationFor(api.models.rooms.index.play)` is a `vi.fn`, so tests drive it with `mockReturnValueOnce(deferred.promise)`. A small `deferred<T>()` helper is added to fake-convex to hold, resolve, or reject the promise.

- **`room.svelte.test.ts`.** The `SeatRoom` helper is rewritten to pass a tic-tac-toe client engine instead of overriding `activeSeat`. Tests cover:
  - pending shows in `displayState`, `activeSeat`, and `isMyTurn`
  - confirm by state match, by resolve, and on a no-op
  - a duplicate snapshot
  - reject: the tail is dropped, `rejection` is set, `error` stays null
  - a round change drops pending entries
  - the scrub view ignores pending entries
  - clock handoff values with fake timers
  - the auto-claim does not fire on the predicted opponent clock
  - `isMyTurnConfirmed`
- **`tictactoe/game.svelte.test.ts`.** `play` predicts, and `canPlay` is false while pending.
- **`checkers/game.svelte.test.ts`.** The chained jump sends two `play` calls in order, and a rejection of the first drops both.
- **`tictactoe.svelte.test.ts`.** With `playMoveSound` mocked, the mark renders once, the same DOM node survives the confirming snapshot, and the sound is called once. A rejection shows the toast; this needs `setupToaster` in the test harness.
- **`checkers.svelte.test.ts`.** The piece node survives confirmation, and a rejection shows the toast.
- **`board.svelte.test.ts`.** A new `rejectionId` calls `Element.prototype.animate` (stubbed) with transform-only keyframes. It does not call it when `matchMedia` reports reduced motion.
- **`turn-alert`.** Its logic is unchanged. The call sites move to `isMyTurnConfirmed`, which the room test covers: a rejection leaves it true throughout.
- **Live QA** (`browser-a`/`browser-b`): a throttled network shows the move at once; the opponent resigns while a move is in flight; the layout-shift observer runs through both; reduced motion is emulated for the shake.

### D11. Impact on callers

| Symbol                                  | Caller                                                                                                    | Group                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Room.submitMove`                       | `TictactoeRoom.play` (game.svelte.ts:127), `CheckersRoom.select` (game.svelte.ts:90)                      | Room core; game rooms                                                                          |
| `Room` constructor                      | `TictactoeRoom`, `CheckersRoom`, `SeatRoom` in room.svelte.test.ts                                        | Game rooms; Room tests                                                                         |
| `Room.displayState`                     | `TictactoeRoom.#displayState`, `CheckersRoom.#displayState`, `SeatRoom.shownState`                        | Unaffected in code: they read it as before and get the prediction                              |
| `Room.activeSeat` (abstract → concrete) | the subclasses' `override activeSeat` (removed); `isMyTurn`; `clock`; the timeout `$effect`               | Room core; game rooms                                                                          |
| `Room.isMyTurn`                         | `CheckersRoom.canMove` (predicted, intended); both `new TurnAlert(...)` (switched to `isMyTurnConfirmed`) | Game components                                                                                |
| `Room.clock`                            | `Board` via `clock={room.clock}` in both components; `Playing` (`room.clock.remaining`)                   | Unaffected in code: same shape; `Playing` never submits moves, so it never has a pending entry |
| `Room.error`                            | `Board` footer in both components; `Playing` (playing.svelte:97)                                          | Unaffected: moves no longer write it, while resign, rematch, abandon, and trashtalk still do   |
| `Board`                                 | both game components                                                                                      | Board shake (new optional prop, so other callers are unaffected)                               |
| `mood.svelte` `activeSeat`              | derived from `BoardStatus` built from `room.turn` and `room.winner`                                       | Unaffected in code: follows the prediction through `displayState`                              |
| `Toaster`                               | game components (new `getToaster()` calls)                                                                | Game components; `+layout.svelte` already calls `setupToaster`                                 |
| fake-convex                             | every room, game, and component test                                                                      | Test helper (`deferred`)                                                                       |

### Trust boundary

There is no change to Convex. `rooms.play` still authenticates the caller (`requirePlayer`), checks seat membership in that room, re-checks that the round is open and the acting clock has time, and re-derives the next state with the engine. The client sends only `{ code, move }`, as today, and the predicted state never leaves the browser. A wrong prediction affects only the predicting viewer's screen, until the next server push or the rejection.

## Risks / Trade-offs

- [The client and server engines diverge, so a prediction differs from the server] → Both import the same `engine.ts`. A mismatch shows as a brief wrong frame that rule 2 (D3) then corrects, with no toast.
- [`play` carries no round, so a move in flight across an opponent's resign and immediate rematch could land in the new round] → This already exists today and is out of scope (no Convex change). D9 makes the client drop the stale prediction. Flagged as an open question for a later server change.
- [The opponent's clock steps up by about one round trip on confirm] → Accepted. The server is the clock authority, and the step is at most the latency.
- [The confirm by resolve depends on the Convex client applying query results before resolving the mutation] → This is the documented client behavior. Rule 1 also makes confirmation visually atomic without it.
- [Removing the abstract `activeSeat` changes the `Room` subclass contract] → There are only two subclasses plus one test helper, all updated in this change. `references/games.md` (the add-a-game recipe) needs the steward to update it: subclasses now pass a client engine instead of overriding `activeSeat`.

## Open Questions

- Should `rooms.play` take the round (or game id) so a stale move cannot land in a new round? That is a server change for a later request, and this design does not depend on it.
