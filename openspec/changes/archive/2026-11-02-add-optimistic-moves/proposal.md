# Proposal

## Why

A seated player's move only appears once the `play` mutation commits and the `rooms.get` query pushes the new state back. Until then the mark or piece is missing, the turn ring and clock stay on the viewer, and the sound is late. On a slow link the board feels unresponsive. The client already imports the pure game engines, so it can predict the viewer's own move locally while the server stays the authority.

## What Changes

- `Room` (`src/lib/utils/multiplayer/room/room.svelte.ts`) keeps an ordered queue of the viewer's pending moves. `submitMove` predicts the next state with the client-side engine (`convex/models/games/{tictactoe,checkers}/engine.ts` and `rules.ts`), queues it, and calls `play`. The live state the boards read is the server state with the pending moves applied.
- A pending move shows at once: the mark or piece, the turn handoff (strips, turn ring, status line, `isMyTurn`, both games' `activeSeat`), and the move sound. Confirming a move does not remount or replay it. In tic-tac-toe this means the mark's `liquidIn` intro, which plays the sound, runs once.
- Clock handoff: while a move is pending, the viewer's seat freezes at its local remaining time and the opponent's seat ticks locally. The server's `remaining`/`turnedAt` replace both when the room query catches up. The timeout auto-claim `$effect` reads only server clock values, never predicted ones.
- A pending move is dropped when the room query reflects it. A server result that leaves the state unchanged is not an error, and the move still clears.
- If `play` rejects, the rejected move and every move queued after it are rolled back. The board shakes (transform only, skipped under `prefers-reduced-motion`) and an error toast gives the reason. Typical causes are an opponent's resign or abandon, a time-up race, or a rematch starting mid-flight.
- Checkers multi-jumps can chain: after a predicted capture with `mustContinueFrom` set, the viewer can queue the next jump before the first one is confirmed.
- Only the viewer's own moves are predicted. Moves stay blocked while scrubbing history, and the history view ignores pending moves.
- The your-turn alert follows the server-confirmed turn, so a rollback that hands the turn back to the viewer does not fire it.

Out of scope:

- Any Convex, schema, auth, or public function change. `play` and the engines are unchanged, and the server re-validates every move as it does today.
- Predicting the opponent's moves, or resign, rematch, abandon, and timeout.
- convex-svelte `optimisticUpdate` (the queue in `Room` replaces it, see design.md).
- Offline queuing or retrying rejected moves.

## Capabilities

### New Capabilities

- `optimistic-moves`: How a seated viewer's own move is shown before the server confirms it. Covers the pending queue, the predicted turn and clock handoff, confirmation, rollback on rejection, checkers jump chaining, and interaction with history scrubbing and the timeout auto-claim.

### Modified Capabilities

- `turn-alerts`: "Detect the viewer's turn arriving" follows the server-confirmed turn. A rollback that hands the turn back to the viewer is not an arriving turn.
- `toast-notifications`: adds a rejected-move toast alongside the copy-link confirmation.
- `ui-accessibility`: "Reduced motion" also covers the rejected-move shake.
- `layout-stability`: a pending move, its confirmation, and its rollback, including the shake and toast, record no layout-shift entries.

## Impact

- Code: `Room` in `room.svelte.ts` (`submitMove`, `displayState`, `isMyTurn`, `#liveRemaining`, `clock`, the timeout auto-claim `$effect`, `error`), `TictactoeRoom` in `tictactoe/game.svelte.ts` (`play`, `activeSeat`, and the live getters that read `data.game.state` directly), `CheckersRoom` in `checkers/game.svelte.ts` (`#state`, `#liveTurn`, `#liveLegalMoves`, `#liveWinner`, `activeSeat`, `select`), `tictactoe.svelte` and `checkers.svelte` (sound timing, shake, `TurnAlert` input), the board footer error slot (`components/layout/board/board.svelte`, `components/ui/playing/playing.svelte`), and the `ui/toast` toaster.
- Tests: `room.svelte.test.ts`, both `game.svelte.test.ts`, both component tests, `turn-alert.svelte.test.ts`, and `fake-convex.svelte.ts`, which needs a controllable pending or rejecting `play` mutation.
- Trust boundary: unchanged. `rooms.play` still authenticates via `ctx.auth`, checks seat membership, and re-validates the move with the engine. A prediction is display-only and never sent as state.
- No schema change, no new public Convex function, no new dependency.
