# Proposal

## Why

A game room shows the board and the player strips, but little around them. A finished round has no summary or one-click rematch. A waiting host has no invite. The room's code and rules aren't on screen. Screen-reader and keyboard users get invalid grid roles and arrow keys that scrub history instead of moving on the board. Three client bugs remain: a failed room query renders a blank page (B10), the wrong-game redirect drops the round (B18), and the status and footer follow the scrubbed snapshot instead of the live game (B24).

## What Changes

- **Result card** over the board when a live round ends: result, reason (time, resignation, left), the viewer's settled rating change, the match score, then Rematch (primary, one click, the existing `rooms.rematch`), New opponent (abandons the room, then opens `/play?game=<type>`), and Lobby. It can be hidden to look at the board.
- **Closed room:** the card says why the room closed (as far as the room query shows it) and offers Play again (`/play?game=<type>`; the Play page restores the remembered opponent and clock).
- **Invite card** over the empty board while the host waits: the code, Copy link (toast), and Share where `navigator.share` exists.
- **Room bar** above the top strip: game, code, round navigation, copy link, and, in tic-tac-toe, a "?" rules popover linking to `/how-to-play/tictactoe`. It replaces the "Round N of M" line below the board.
- **Round controls row:** first, back, forward, and live replay buttons around the action button. Resign and Abandon ask for confirmation. Spectators see a "Spectating" pill instead of disabled buttons.
- **Notice line** under the controls: the room error as a compact inline alert. A dropped opponent shows "Reconnecting…" in their strip instead, announced as "Alex disconnected".
- **Desktop side panel at `lg`:** room info, the viewer's round list with results and rating changes, Resign, and a keyboard-shortcuts tooltip.
- **Ultimate tic-tac-toe:** the mover's forbidden last board stays dimmed. No seat-colored rings on mini-boards or strips.
- **Checkers:** "You must capture" in the viewer's strip when a capture is forced.
- **Last-move highlight** in both games, live and while scrubbing.
- **Board accessibility:** valid roles (`group`), useful cell labels, light checkers squares as plain `div`s, a roving tabindex with arrow keys inside the board, and history scrubbing only from outside the board or with `[` / `]`.
- **Bugs:** B10 (error branch), B18 (redirect keeps the round), B24 (status, footer, and mood follow the live state).

Out of scope:

- Tap-to-zoom, rematch request/accept, and offer draw.
- Any `convex/` change (change E, `fix-game-integrity`, owns the server). So the room bar does not show the time control and the closed-room reason is derived, not read from `rooms.reason` (see design Open Questions).
- The app header, footer, `/play`, `/lobby`, `/history`, `/leaderboard`, and `/how-to-play` itself (change D, `add-product-pages`, creates it).

## Capabilities

### New Capabilities

- `round-result`: the card shown when a round ends or the room closes, and its actions.
- `room-info`: the room bar, the invite card, and the desktop side panel.
- `board-accessibility`: board roles, cell labels, in-board keyboard navigation, and which keys scrub history.
- `move-replay`: replay buttons, the last-move highlight, and the live status while scrubbing.
- `room-access`: what a room page shows when the room query fails, and the wrong-game redirect.
- `board-hints`: the dimmed forbidden mini-board in tic-tac-toe.

### Modified Capabilities

- `player-strips`: the strip line gains "You must capture"; the opponent's strip reads "Reconnecting…" while they're away, and a second status region announces it; the round controls row holds replay buttons, confirmations, and the Spectating pill, the round counter moves to the room bar, and the turn ring is removed.
- `layout-stability`: the room placeholder mirrors the new room bar and drops the round line.

## Impact

- Code: `src/lib/components/layout/board/*` (board, placeholder, strips, new sibling components and helpers), `src/lib/features/play/{tictactoe,checkers}/*` (components, room classes, labels), `src/lib/utils/multiplayer/room/*` (`loadError`, `previousDisplayState`, `liveOutcome`, `rounds`, `roomPath`, fake-convex query errors), and their tests.
- Reads the existing `rooms.history` query for the round list and settled rating changes. Calls only existing mutations (`rematch`, `resign`, `abandon`).
- No schema change, no new Convex function, no auth or trust-boundary change.
- Depends on change E for rating changes and scores settled at round end; until it lands the rating line stays blank and the score updates on rematch.
- Depends on change D for `/how-to-play/tictactoe`.
