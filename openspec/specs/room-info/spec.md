# room-info Specification

## Purpose

Defines how a game room shows what room it is and how to share it: the room bar above the board, the invite card while the host waits, and the desktop side panel.

## Requirements

### Requirement: Room bar

Below the `lg` breakpoint, a one-line bar SHALL sit above the top strip at the board's width. It SHALL show the game icon (named by the game's name), the room code in monospace, the previous-round and next-round buttons around "Round N of M", and a Copy link button. From `sm`, the game's name SHALL also be visible. The bar SHALL NOT wrap.

#### Scenario: Bar at 360px

- **WHEN** a seated viewer opens round 2 of 3 of tic-tac-toe room `ABCD` at 360x640
- **THEN** one bar above the top strip shows the room code `ABCD`, "Round 2 of 3", previous and next round buttons, and Copy link, on one line no wider than the board

#### Scenario: Round navigation

- **WHEN** the viewer clicks the previous-round button on round 2
- **THEN** the browser opens round 1 of the same room

### Requirement: Copy and share the room link

Copy link SHALL write the room's URL to the clipboard and show the "Link copied" toast, or the "Couldn't copy the link" error toast on failure. Share SHALL open the system share sheet with the room's URL and SHALL be offered only where the browser supports it. While the invite card is shown to the seated host, it SHALL hold the only visible Copy link: the room bar's and the side panel's Copy link buttons SHALL be invisible and keep their space.

#### Scenario: Copy link

- **WHEN** the viewer clicks Copy link in room `ABCD` of checkers
- **THEN** the clipboard holds the URL ending in `/checkers/ABCD` and the "Link copied" toast shows

#### Scenario: One Copy link while inviting

- **WHEN** the seated host waits for an opponent at 360x640 and at 1280x800
- **THEN** only the invite card shows Copy link, and the room bar's and side panel's Copy link buttons are invisible in an unchanged box

#### Scenario: No share support

- **WHEN** the browser has no `navigator.share`
- **THEN** no Share button is shown and no layout-shift entry is recorded

### Requirement: Invite card while waiting

While a seated host waits for an opponent in an open room, the board area SHALL show an invite card with the room code, Copy link, and Share. Other viewers SHALL see "Waiting for an opponent" in the card without the buttons. The card SHALL disappear when the second player joins.

#### Scenario: Host waiting

- **WHEN** the host of room `ABCD` waits for an opponent
- **THEN** the board area shows `ABCD`, Copy link, and, where supported, Share

#### Scenario: Opponent joins

- **WHEN** a second player joins
- **THEN** the invite card is gone and no layout-shift entry is recorded

### Requirement: Desktop side panel

At `lg` and wider, a side panel SHALL sit beside the board column, level with the upper strip's top and the lower strip's bottom. From top to bottom it SHALL show the game, code, "Keyboard shortcuts", and Copy link; the round list, scrolling inside the panel; the notice line; the replay buttons; and the round action or the Spectating pill. It SHALL NOT repeat the players, scores, or clocks. At `lg` the room bar and the controls row SHALL be hidden.

#### Scenario: Panel at 1280px

- **WHEN** a seated player views a live room at 1280x800
- **THEN** a panel beside the board shows the room code, a "Keyboard shortcuts" button, the replay buttons, and a Resign button at its bottom, no room bar shows above the strips, and nothing shows below the lower strip, and the panel has no player names, scores, or clocks

#### Scenario: Panel matches the column's height

- **WHEN** a room renders at 1280x800
- **THEN** the panel's top edge equals the upper strip's top edge and its bottom edge equals the lower strip's bottom edge

#### Scenario: No panel on phones

- **WHEN** the same room renders at 360x640
- **THEN** no side panel is rendered and the room bar is shown

### Requirement: Keyboard shortcuts tooltip

The side panel's "Keyboard shortcuts" button SHALL show, on hover or focus, a popover-styled tooltip listing "← → ↑ ↓ Move on the board", "[ ] Step through moves", and "Esc Close", with each key drawn as a key cap.

#### Scenario: Focus the button

- **WHEN** the viewer focuses "Keyboard shortcuts" at 1280x800
- **THEN** a tooltip lists the three shortcut rows with each key in a key cap

### Requirement: Round list in the side panel

For a seated viewer, the side panel SHALL list the room's rounds, newest first, each with its number, the viewer's result (Win, Loss, Draw, or Playing) in a fixed-width, right-aligned column, and its settled rating change signed with "+" or "−", or "—" while it is not known. Selecting a round SHALL open it. Spectators SHALL see no round list.

#### Scenario: Two finished rounds and a live one

- **WHEN** a seated viewer won round 1 (+8), lost round 2 (-8), and plays round 3
- **THEN** the list reads round 3 "Playing —", round 2 "Loss −8", round 1 "Win +8", and the result columns of all three rows share one left and right edge

#### Scenario: Open a past round

- **WHEN** the viewer selects round 1 in the list
- **THEN** the browser opens round 1 of the room
