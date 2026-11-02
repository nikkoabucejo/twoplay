# Design

## Context

See proposal.md for why. Current state:

- `Board` (`src/lib/components/layout/board/board.svelte`, 535 lines) renders the two strips, the board area, the one `role="status"` span, and a footer: round chevrons around the action (Resign/Rematch dropdowns that each also offer Abandon, a disabled button for spectators), the "Round N of M" line (`h-4`), and the error slot (`h-5`). `BOARD_SIZE` reserves 19.75rem of height. At 360x640 the board is 324px; the `player-strips` spec requires at least 300px. The real phone header is `h-14`, but the budget counts 4rem.
- `tictactoe.svelte` and `checkers.svelte` each build `BoardStatus` from `room.winner`, `room.isOver`, and `room.turn`. Those read `displayState`, so scrubbing changes the status, the ring, the footer's `roundOver`, and the mood (B24). Both redirect a wrong-game room to `/${data.type}/${roomCode}` and drop `round` (B18). Neither branches on a query error, so `isLoading` is false, `data` is undefined, and nothing renders (B10). Both bind window-level arrow keys to scrubbing.
- Both boards use `role="grid"` with buttons as direct children, which is invalid without `row`/`gridcell`. Checkers light squares are disabled buttons.
- `Room` (`src/lib/utils/multiplayer/room/room.svelte.ts`) keeps the add-optimistic-moves design: `#pending`, `#fold`, `#liveState`, `activeSeat`, `isMyTurnConfirmed`, `rejection`. `ClientEngine.status` returns `{ turnIndex, isOver }`, but both engines also return `winnerIndex`. `useQuery` exposes `error`, which `Room` ignores. The fake in `fake-convex.svelte.ts` hard-codes `error: undefined`.
- `rooms.get` returns `game.reason` (`timeout | resign | abandon`) and `game.endedSeat`. It does not return the room's `time`, its close `reason`, or any rating change. `rooms.history` (per signed-in user) returns each room's rounds with `result` and the settled `mmr`.
- Change E (`fix-game-integrity`) settles score and MMR when a round ends instead of at rematch, keeps every query's return shape, and leaves no-contest rounds out of `rooms.history`.
- The tic-tac-toe rule the client must show: a player may not play the board they played on their previous turn (`lastBoardBySymbol`) unless it is the only open board (`hasOtherPlayableBoard`). `TictactoeRoom.isForbidden` already encodes it. There is no "send-to-board" rule.

## Goals / Non-Goals

**Goals:**

- Every new surface keeps the zero-shift contract: fixed boxes, overlays for cards, `transform`/`opacity` motion, and `motion-reduce` holding still.
- Logic that decides text, keys, or state lives in pure helpers or `Room` getters with Vitest coverage. Markup work has no class-name tests.
- `Room` keeps every add-optimistic-moves behavior: the pending queue, `rejection`, the shake, and `isMyTurnConfirmed` feeding `TurnAlert`.

**Non-Goals:**

- Showing the time control in the room bar, and reading the room's true close reason. Both need `rooms.get` fields (see Open Questions).
- Passing `round` to `rooms.rematch` (change E adds the argument; wiring it is a later client change).

## Decisions

### D1. Height budget: the room bar replaces the round line

Phone column, top to bottom: room bar `h-8`, strip `h-14`, board, strip `h-14`, controls row `h-8`, notice line `h-5`, with five `gap-2`. That is 4 (header) + 2 (page `py-4`) + 2 + 7 + 2 + 1.25 + 2.5 = **20.75rem**. At 360x640 the board is min(336px, 308px) = **308px**, so the spec's 300px still holds. The update goes into the `BOARD_SIZE` comment and value, and `BoardPlaceholder` mirrors it.

Round navigation moves from the controls row into the room bar (`‹ Round 2 of 3 ›`). The controls row becomes `[First][Prev] [action w-28] [Next][Live]`: 4×32 + 112 + 4×6 = 264px, which fits in 308px. The room bar shows the game icon (with the name `sr-only` below `sm`), the code, the round group, "Rules" (tic-tac-toe), and Copy link, at about 296px.

Alternative rejected: keep the round line and add the room bar and a separate replay row. That costs 22.5rem, a 280px board, and breaks `player-strips`.

At `lg` the room bar and the whole controls row are hidden (`lg:hidden`), so the board column is just strip, board, strip. `SidePanel` sits beside it (panel `w-72`, stretched to the column's height, its inner box absolutely filled so the round list scrolls instead of growing the row). The panel holds, top to bottom: room info (with a "Keyboard shortcuts" tooltip button), round list, then `Controls` in its stacked layout (notice line, the four replay buttons in a row, the round action full width), pinned beside the lower strip. It switches by breakpoint only, so nothing moves after paint.

`BOARD_SIZE` reads the chrome height from `--board-chrome`, which `BOARD_CHROME` sets to 20.75rem below `lg` and 14rem from `lg` (header 4, `py-4` 2, two strips 7, two gaps 1). At 1280x800 the board reaches its 34rem (544px) cap. `BoardPlaceholder` uses the same classes.

### D2. Board composes the room chrome from sibling components

New files in the `board` leaf, each one region of the room:

| File                 | Renders                                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `room-bar.svelte`    | game, code, round navigation, Rules slot, Copy link                                                                                                                                    |
| `controls.svelte`    | the replay buttons, the action or the Spectating pill, the Resign/Abandon confirm popover, and the notice line (the room error only, as a compact inline alert)                        |
| `result-card.svelte` | the round-end and closed-room card, overlaid in the board area                                                                                                                         |
| `invite-card.svelte` | the waiting card, overlaid in the board area                                                                                                                                           |
| `side-panel.svelte`  | the `lg` panel: room info with the keyboard-shortcuts tooltip, the round list, and `Controls` stacked at its bottom. No player block, since the strips show names, scores, and clocks. |

`board.svelte` keeps the strips, the board area, the shake, the mood, and the turn `role="status"`. It renders the pieces above from props. New props:

- `room: BoardRoom` = `{ type, name, code }`
- `replay: BoardReplay` = `{ canStepBack, canStepForward, onFirst, onBack, onForward, onLive }`
- `result: ResultView | null`
- `rounds: RoundRow[]`
- `rules?: Snippet`
- `mustCapture?: boolean`

`BoardFooter` gains `onNewOpponent` and `onLobby`, and its existing fields stay.

Alternative rejected: each game component composes the bar, card, and panel itself. That doubles about 300 lines of markup across two files and lets the games drift. `Board` is already the shared room region.

### D3. Pure helpers own the decisions (engineer, tested)

| Helper                                                                    | File                  | Decides                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roomStatus(input)`                                                       | `board/status.ts`     | `BoardStatus` from `{ isWaitingForOpponent, isRoomClosed, endedSeat, reason, live: { turnIndex, winnerIndex, isOver } }`. Both games call it with `room.liveOutcome`, which fixes B24 for the strips, the ring, `role="status"`, the controls, and the mood together. |
| `resultView(input)`                                                       | `board/outcome.ts`    | headline, reason line, rating text, score, which actions, and the closed-room reason (D8, D9)                                                                                                                                                                         |
| `scrubCommand(key, ctx)` / `rovingStep(slot, key, layout)`                | `board/keys.ts`       | D6                                                                                                                                                                                                                                                                    |
| `roomUrl(origin, type, code)` / `copyRoomLink` / `canShare` / `shareRoom` | `board/invite.ts`     | the link, plus clipboard and share with toasts                                                                                                                                                                                                                        |
| `stripLine`                                                               | `board/strips.ts`     | gains `"must-capture"` when `mustCapture && seat === myIndex && status` is the viewer's turn                                                                                                                                                                          |
| `cellLabel(boardIndex, cellIndex, cell, isPlayable)`, `BOARD_POSITIONS`   | `tictactoe/labels.ts` | the cell names                                                                                                                                                                                                                                                        |
| `squareName(index)` / `squareLabel(index, piece, ability)`                | `checkers/labels.ts`  | the square names                                                                                                                                                                                                                                                      |

`invite.ts` duplicates the 10-line `copyLink` in `features/core/play`, which change B owns. See Open Questions.

### D4. Room additions (engineer)

- `ClientEngine.status` return type widens to `{ turnIndex, isOver, winnerIndex: number | null }`. Both adapters already delegate to engines that return it.
- `liveOutcome = $derived` of `{ turnIndex, winnerIndex, isOver }` from `#liveState`, or null. It follows pending moves, as `activeSeat` does.
- `get loadError()` returns `this.#room.error ?? null`.
- `protected previousDisplayState` (D5).
- `rounds`: `useQuery(api.models.rooms.index.history, () => (this.myIndex === null ? "skip" : {}))`, filtered to this room's code and mapped to `{ round, result, mmr }`. It is the source for the side panel list and the card's rating line (D8).
- `roomPath(type, code, round?)` in `room/index.ts` (exported through `$lib/utils/multiplayer`). It is used by the wrong-game redirect (B18), round navigation, and Go live.
- `fake-convex.svelte.ts` gains `setQueryError(query, error)`, and `useQuery` reads `error` from it.

### D5. Last move = the shown state against the one before it

`previousDisplayState`:

- **Live**, with pending moves applied: the fold's state before the last applied pending move. `#fold` records the states in order.
- **Live**, otherwise: the last history entry whose board differs from the shown state. This covers history arriving one push behind the room query, because `isSameState` already exists.
- **Scrubbing**: `history[cursor - 1]?.state`.
- Null when none applies.

Subclasses diff the two states:

- `TictactoeRoom.lastMove`: `{ boardIndex, cellIndex, seat }`, where a null previous state means the only filled cell.
- `CheckersRoom.lastMove`: `{ from, to, seat }`. A null previous state falls back to `checkersEngine.createInitialState()`. A multi-jump highlights the last hop.

Markup tints those squares with `ACCENTS[seat].tintBg` (color only).

Alternative rejected: storing the move on each history row. That is a Convex change.

### D6. Roles and keys: `group` + roving tabindex, not ARIA `grid`

Options:

- **(a) ARIA grid.** `grid > row > gridcell`. Tic-tac-toe's DOM is per mini-board, so 9x9 rows would need `aria-owns` across subtrees. Checkers would need row wrappers with `display: contents`.
- **(b) Nested `group`s of buttons.** Labels carry the coordinates, and a roving tabindex gives grid-like arrows.

Chosen: (b). It is valid for both games without restructuring the DOM, and the labels already say where a cell is.

Key handling:

- **`rovingStep(slot, key, layout)`** works on visual slots.
  - Tic-tac-toe maps `(board, cell)` to a 9x9 position: `row = ⌊b/3⌋·3 + ⌊c/3⌋`, `col = (b%3)·3 + c%3`.
  - Checkers moves over dark squares only. Left and right step two columns. Up and down go to the next row's dark square at `col + 1`, or `col - 1` at the edge.
  - Movement stops at the edges. Home and End go to the first and last slot.
  - Each game keeps `focusedSlot` `$state`. Its button gets `tabindex={slot === focusedSlot ? 0 : -1}`, and the group's `onkeydown` focuses `[data-slot-index]`.
- **`scrubCommand(key, { isInBoard, isTextField })`** returns `back | forward | first | live | null`.
  - Arrows map to commands only when `!isInBoard`.
  - `[` and `]` map to back and forward unless `isTextField`.
  - `isInBoard` is `target.closest('[data-board-grid]') !== null`.

Light checkers squares become `<div aria-hidden="true">`.

### D7. Forbidden mini-board dimmed, no rings

`TictactoeRoom.isPlayable(boardIndex)` is true when all of these hold:

- the round is live, `endedSeat === null`, and the room is not waiting
- the viewer is not scrubbing
- the game is not over
- the board's status is `playing`
- `!isForbidden(boardIndex)`

It is the mover's rule and does not depend on who is viewing. `canPlay` stays the viewer gate and drives the cell labels.

No mini-board shows a seat-colored ring: a border that changes color with every turn proved distracting. The only visual cue is `opacity-40` on the `isForbidden` board. The player strips likewise keep a constant neutral border; the turn shows in the strip's status line and the running clock.

The Rules popover text:

- "Three in a row wins a board."
- "Three boards in a row wins the game."
- "You can't play the board you played last turn, unless it's the only open board."
- A link: "How to play" → `/how-to-play/tictactoe`.

It is passed as the `rules` snippet, so `Board` stays game-agnostic. It is rendered in the room bar and in the side panel.

### D8. Rating line source

Options:

- **(a) A flat client constant of ±8.** It is wrong at the rating floor (`MIN_RATING`) and for no-contest rounds.
- **(b) The settled `mmr` from `rooms.history`.**
- **(c) A new `rooms.get` field.** That is a Convex change, owned by E.

Chosen: (b). After change E, the round's `mmr` is written in the same mutation that ends it, so the card's line fills in the same push. Before E, it stays blank (a reserved box) until rematch settles the round.

The score comes from `players[i].score`. After E it already counts the round.

### D9. Closed-room reason, derived

Ordered rules:

1. Closed while waiting: "Nobody joined, so the room closed". This also covers a host who cancelled before anyone joined. The copy is accepted for both cases.
2. Closed with `game.reason === "abandon"`: "You left the room" when `endedSeat === myIndex`, otherwise "<name> left the room".
3. Anything else: "This room is closed".

Play again opens `/play?game=<type>`. Change B's Play page restores the remembered opponent and clock, which keeps the settings without a URL contract.

### D10. Result card lifecycle

The card is shown when all of these hold:

- `game.isLive`
- `!isViewingHistory`
- the status is `winner` or `draw`, or the room is closed with no live round

`dismissedRound` (`$state` in `Board`) hides it for that round. "View board" or Escape sets it.

The card's actions:

- **Rematch** calls `footer.onRematch` directly. The controls row's Rematch also loses its dropdown, since Abandon moves to the card as New opponent.
- **New opponent** awaits `room.abandon()`, then `goto(/play?game=<type>)`. On error it stays, and `room.error` shows in the notice line.
- **Lobby** calls `goto("/lobby")` without leaving the room. The header's live-game pill leads back.

The card fades and scales in with `opacity` and `transform`, and uses `motion-reduce:transition-none`.

### D11. Room error branch (B10)

In both components, `{:else if room.loadError}` comes before `data === null`. It shows the message, Retry (`location.reload()`), and "Back to play". The branch order is tested in the component tests through `setQueryError`.

### Trust boundary

There is no Convex change. The client calls only `rooms.rematch`, `games.resign`, `rooms.abandon`, and `rooms.play`, each of which already authenticates through `ctx.auth` and checks the caller's seat in that room. The added read is `rooms.history`, which `requireUser`s and returns only the caller's own rooms. Everything this change derives (status, labels, the playable ring, the result text, and the closed reason) is display only. The server still re-derives turn, legality, and results.

## Risks / Trade-offs

- [`rooms.history` loads every room of the viewer for one room's rounds] → It is acceptable at current volumes, it is skipped for spectators, and a per-room query is an open question for the server owner.
- [The rating line stays blank until change E lands] → It is specified as blank, not wrong. Ordering E first removes it.
- [The derived closed reason says "This room is closed" when someone left after a finished round] → It is the honest fallback. A server field fixes it later.
- [Two `role="status"` regions] → The `player-strips` delta names the second one and keeps it empty unless the opponent has dropped.
- [The `layout-stability` "Placeholders match their content's box" requirement may be modified by another in-flight change] → Archive order matters. The steward merges the scenarios.
- [`/how-to-play/tictactoe` 404s until change D lands] → The link is static. QA after D.
- [Shared symbols change shape] → `Board`, `BoardPlaceholder`, and `BoardStatus` are used only by the two game components, the `board` tests, and `mood.svelte.ts` (type only, unchanged). `ClientEngine` is used by the two game rooms and `room.svelte.test.ts`. All are updated in this change.

## Open Questions

- Should `rooms.get` return the room's `time` and close `reason`, so the room bar can show the time control and the card can say "both players went idle"? That belongs to change E or a follow-up. This change leaves both out.
- Should `copyLink` be exported from `features/core/play` (change B) so `board/invite.ts` can reuse it?
