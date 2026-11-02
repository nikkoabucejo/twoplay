# Tasks

No server work: this change touches no file under `convex/`. Polish lane: tests cover logic (helpers, `Room` getters, branch order). Markup is checked by the layout-shift script and live QA.

## 1. Room core (parallel-safe)

- [x] 1.1 [engineer] Tests first in `src/lib/utils/multiplayer/room/room.svelte.test.ts`:
  - `liveOutcome` follows a pending move and ignores the scrub cursor.
  - `loadError` returns a query error set through a new `setQueryError`.
  - `previousDisplayState`: live with history one push behind, live with a pending move, and while scrubbing.
  - `rounds` filters `rooms.history` to this room's code, and the query is skipped for a spectator.
  - `roomPath("checkers", "ABCD", 2)` gives `/checkers/ABCD/2`, and without a round gives `/checkers/ABCD`.
  - Existing pending, `rejection`, and `isMyTurnConfirmed` tests still pass.
- [x] 1.2 [engineer] Implement design D4 and D5:
  - In `fake-convex.svelte.ts`: `setQueryError`, with `useQuery().error` reading it and `resetConvex` clearing it.
  - In `room.svelte.ts`:
    - widen `ClientEngine.status` with `winnerIndex`
    - `liveOutcome`
    - `get loadError()`
    - `protected previousDisplayState` (record states in `#fold`)
    - `rounds` from `api.models.rooms.index.history`
  - In `room/index.ts` and `src/lib/utils/multiplayer/index.ts`: `roomPath`.
  - Verify: 1.1 passes.

## 2. Board helpers (parallel-safe)

- [x] 2.1 [engineer] Tests first, in the test file next to each helper:
  - `board/status.test.ts`, `roomStatus`:
    - waiting, and closed waiting
    - endedSeat with each reason
    - live winner, draw, and turn
    - a scrubbed display does not affect it, because the input is live only
  - `board/outcome.test.ts`, `resultView`:
    - every `round-result` scenario: the headline, the reason line, rating "+8 rating", "-8 rating", "Rating unchanged", or blank when `mmr` is null, no rating line for a spectator
    - the actions per viewer
    - the three closed-room reasons and the fallback
  - `board/keys.test.ts`:
    - `scrubCommand`: arrows outside the board, arrows inside the board → null, `[`/`]` inside the board, a text field → null
    - `rovingStep`, tic-tac-toe 9x9: board 1 cell 3 → ArrowRight → board 2 cell 1; edges stop; Home/End
    - `rovingStep`, checkers dark-only: a1 → ArrowRight → c1; up and down at the edge columns
  - `board/invite.test.ts`:
    - `roomUrl`
    - `copyRoomLink` success and failure toasts
    - `canShare`
    - `shareRoom` swallows `AbortError`
  - `strips.test.ts`: `"must-capture"` only on the viewer's own turn strip.
- [x] 2.2 [engineer] Implement `status.ts`, `outcome.ts`, `keys.ts`, and `invite.ts` in `src/lib/components/layout/board/`, and the `must-capture` line in `strips.ts`. Export the types and helpers the games need from `board/index.ts` and `src/lib/components/layout/index.ts`. Verify: 2.1 passes.

## 3. Game room logic

- [x] 3.1 [engineer] Tests first:
  - `tictactoe/game.svelte.test.ts`:
    - `isPlayable`: every open board except the mover's last board, the only-open-board exception, none when over, none while scrubbing
    - `lastMove` live, pending, and scrubbed
  - `checkers/game.svelte.test.ts`:
    - `lastMove` for a step, a jump, and the first move
    - `mustCapture` true only when every legal move captures on the viewer's live turn
  - New `tictactoe/labels.test.ts`: "Board 5 (center), cell 3 — empty, playable" and "Board 1 (top left), cell 1 — O".
  - New `checkers/labels.test.ts`: "e3, cyan king, can capture", "d4, empty", and squares named from seat 0's side regardless of flip.
- [x] 3.2 [engineer] Implement:
  - `TictactoeRoom.isPlayable` and `lastMove` in `tictactoe/game.svelte.ts`
  - `CheckersRoom.lastMove` and `mustCapture` in `checkers/game.svelte.ts`
  - `tictactoe/labels.ts` (`BOARD_POSITIONS`, `cellLabel`) and `checkers/labels.ts` (`squareName`, `squareLabel`)
  - the barrel lines
  - Verify: 3.1 passes.

## 4. Board chrome

Depends on 2.

- [x] 4.1 [designer] Split the footer out of `board.svelte` into `controls.svelte`:
  - replay buttons (First move, Previous move, Next move, Live) around the `w-28` action slot
  - Rematch as a single button
  - Resign and Abandon menu items that open a confirm popover ("Resign this round?" / "Leave and close this room?", confirm and Cancel)
  - a "Spectating" pill for spectators
  - the notice line `h-5`: the room error only, as a compact inline alert (`role="alert"`). A disconnected opponent shows in their strip ("Reconnecting…", amber dot, dimmed), announced by a visually hidden `role="status"` "<name> disconnected".
  - Add `replay` and the `onNewOpponent`/`onLobby` footer fields to the `Board` props. Update `board.svelte.test.ts` only where selectors moved (round counter, chevrons).
- [x] 4.2 [designer] Add `room-bar.svelte`, `h-8`, `whitespace-nowrap`, `lg:hidden`:
  - game icon from `GAMES[type]`, with the name `sr-only` below `sm`
  - mono code
  - `‹ Round N of M ›`
  - the `rules` snippet slot
  - an icon-sm Copy link button using `copyRoomLink`
  - Update `BOARD_SIZE` to 20.75rem and its comment (design D1).
- [x] 4.3 [designer] Add `result-card.svelte` and `invite-card.svelte`, overlaid `absolute inset-0` in the board area:
  - Motion: `opacity` and `transform` only, with `motion-reduce:transition-none`.
  - Result card: `resultView` text, Rematch primary, New opponent, Lobby, and "View board". `dismissedRound` state plus Escape.
  - Invite card: code, Copy link, and Share shown only when `canShare()`, with the slot sized so its appearance moves nothing outside the card.
- [x] 4.4 [designer] Add `side-panel.svelte`, `hidden lg:flex w-72`, at the column's height:
  - game, code, Copy link, and `rules`
  - the round list from `rounds` (Win/Loss/Draw/Playing, signed `mmr`, each a link to `roomPath`)
  - a "Keyboard shortcuts" icon button beside Rules and Copy link, with a tooltip of key-cap rows (the board area keeps the visually hidden key description)
  - at its bottom, beside the lower strip: the notice line, the replay buttons, and the action or the Spectating pill (`Controls` stacked)
  - `board.svelte` becomes the column plus the panel, stretched to one height. The controls row is `lg:hidden`, so the column is strip, board, strip. `BOARD_SIZE` uses `--board-chrome` (20.75rem, 14rem from `lg`).
- [x] 4.5 [designer] Update `board-placeholder.svelte` and its test to mirror the room bar slot, the strips, the board, the controls row, and the notice line below `lg`, and at `lg` only the strips and board beside the panel box, with no round line. Verify: `board-placeholder.svelte.test.ts` passes.

## 5. Game components

Depends on 1, 3, and 4.

- [x] 5.1 [engineer] Tests first in `tictactoe.svelte.test.ts` and `checkers.svelte.test.ts`:
  - a query error renders "Couldn't load this room." with Retry and "Back to play" (B10)
  - a wrong-game room with `round=2` calls `goto("/checkers/ABCD/2", { replaceState: true })` (B18)
  - while scrubbing a finished round the status region still reads the live result (B24)
  - ArrowLeft inside the board moves focus and does not scrub, while `[` scrubs
  - no element has role `grid`
  - the rejection toast and the move sound are unchanged
- [x] 5.2 [designer] `tictactoe.svelte`:
  - B24: replace the local `status` with `roomStatus(...)` from `room.liveOutcome`.
  - B10/B18: add the `room.loadError` branch, and use `roomPath` for the redirect, Go live, and round navigation.
  - New opponent: await `abandon`, then go to `/play?game=tictactoe`. Lobby goes to `/lobby`.
  - Keys: `handleKeydown` goes through `scrubCommand`.
  - Board markup:
    - `role="group"` boards with `data-board-grid`, and mini-boards named by `BOARD_POSITIONS`
    - `cellLabel` names
    - roving `tabindex` via `rovingStep`
    - no seat-colored ring on any mini-board; `opacity-40` only when `isForbidden`
    - a `tintBg` last-move cell
  - Pass the Rules popover snippet: three rules per design D7 and a link to `/how-to-play/tictactoe`. Pass `room`, `replay`, `result`, and `rounds` to `Board`.
- [x] 5.3 [designer] `checkers.svelte`:
  - The same status, error, redirect, navigation, and key changes as 5.2.
  - Board markup:
    - light squares become `<div aria-hidden="true">`
    - dark squares get a `squareLabel` name and a roving `tabindex` over dark squares
    - `tintBg` on the last move's from and to squares
  - Pass `mustCapture` to `Board`, and no `rules`.
  - Verify: 5.1 passes.
- [x] 5.4 [designer] Check `src/routes/(games)/{tictactoe,checkers}/[code]/[[round]]/+page.svelte` keep `px-3 py-4` and let the `lg` row fit at 1280x800. Edit them only if the panel overflows.

## 6. Verification

- [x] 6.1 `pnpm test`
- [x] 6.2 `pnpm check` (0 errors, 0 warnings)
- [x] 6.3 `pnpm format:check`
- [x] 6.4 `pnpm build`
- [ ] 6.5 Run `.agents/scripts/layout-shift.mjs` on `/tictactoe/<code>` and `/checkers/<code>` at 360x640 and 1280x800 through load, three turns, round end (result card), View board, and waiting (invite card). It must record 0 entries. At 360x640, also measure the board at ≥300px and the room bar on one line.
- [ ] 6.6 Live QA (browser-a, browser-b):
  - Invite card: Copy link toast; Share absent when unsupported.
  - Result card after a win, a resignation, a timeout, and a draw. Rematch in one click. New opponent lands on `/play?game=…`. Lobby.
  - Closed-room card after an abandon.
  - Browser-b's strip reads "Reconnecting…" and dims after closing its tab for over 30 s.
  - Spectating pill in a third session.
  - Resign confirm and cancel.
  - Replay buttons and the last-move highlight in both games.
  - Tic-tac-toe: only the mover's forbidden last board dims; no board or strip border changes with the turn. Rules popover.
  - Checkers "You must capture".
  - Keyboard only: Tab into the board, arrows move, `[`/`]` scrub, Escape hides the card.
  - Reduced motion holds the cards still.
  - Side panel at 1280x800.
  - The pending move, rejection shake, and turn alert are unchanged.

## Workflow follow-up

- The steward updates `.agents/skills/twoplay/references/games.md`:
  - `ClientEngine.status` returns `winnerIndex`
  - the component recipe uses `roomStatus`, `roomPath`, `loadError`, and the `Board` `room`/`replay`/`result`/`rounds` props
  - board roles are `group` with a roving tabindex
- The steward also adds a decisions entry for the room bar replacing the round line.
- Archive after the verifier passes and review findings are resolved.
