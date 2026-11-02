# Spec Delta

## Purpose

The /play page, where a signed-in player picks a game, an opponent, and a clock, then queues, creates a room, joins by code, or returns to their active game.

## ADDED Requirements

### Requirement: Game cards

/play SHALL show one card per game in a radiogroup. Arrow keys SHALL move the selection with wraparound, Home and End SHALL select the first and last card, and only the selected card SHALL be in the tab order. A valid `?game=` value SHALL preselect its card.

#### Scenario: Arrow key selects the next game

- **WHEN** the tic-tac-toe card is selected and has focus and the user presses ArrowRight
- **THEN** the checkers card is checked and focused

#### Scenario: Query preselects a game

- **WHEN** /play opens with `?game=checkers`
- **THEN** the checkers card is checked

### Requirement: Opponent choice

The opponent choice SHALL offer "Anyone", "A friend", and "Open room", and SHALL show a one-line hint for the selected choice. Anyone SHALL start matchmaking, A friend SHALL create a private room, and Open room SHALL create a public room.

#### Scenario: A friend creates a private room

- **WHEN** "A friend" is selected and the user presses Create room
- **THEN** the room is created with private visibility

### Requirement: Pending start

While a Find match or Create room call is in flight, its button SHALL be disabled and SHALL show a spinner with "Finding…" or "Creating…", without changing its size.

#### Scenario: Creating

- **WHEN** Create room is pressed and the call has not resolved
- **THEN** the button is disabled and reads "Creating…"

### Requirement: Waiting room

After a room is created, /play SHALL show "Waiting for your opponent…" with the room code, Copy link, Cancel room, and Share where `navigator.share` exists. It SHALL stay until the second seat fills, then open the room. Cancel room SHALL abandon the room and return to setup. Reloading /play while the viewer's active room has only their seat SHALL show the waiting room again.

#### Scenario: Share hidden without Web Share

- **WHEN** the waiting room shows and `navigator.share` is undefined
- **THEN** there is no Share button and Copy link is shown

#### Scenario: Cancel room

- **WHEN** the user presses Cancel room
- **THEN** the room is abandoned and the setup controls return

#### Scenario: Opponent joins

- **WHEN** the waiting room's second seat fills
- **THEN** the page navigates to the room

### Requirement: Matchmaking queue view

While queued, /play SHALL show a spinner, the game and clock, an mm:ss elapsed timer, "Play a friend instead", and Cancel. Cancel SHALL leave the queue. "Play a friend instead" SHALL leave the queue and select "A friend". Leaving /play while queued SHALL request leaving the queue.

#### Scenario: Elapsed timer format

- **WHEN** 75 seconds have passed since the queue view appeared
- **THEN** the timer reads `01:15`

#### Scenario: Leaving the page cancels the queue

- **WHEN** the user is queued and /play is torn down or the page fires `pagehide`
- **THEN** a queue cancel is requested

#### Scenario: Play a friend instead

- **WHEN** the user presses "Play a friend instead" while queued
- **THEN** a queue cancel is requested and "A friend" is selected

### Requirement: Active game card

When /play loads and the viewer already has an active room that is not waiting for an opponent, the page SHALL show the shared Playing card for that room instead of navigating. The page SHALL navigate on its own only when this page's queue entry or created room produces the active room.

#### Scenario: No silent redirect

- **WHEN** /play loads and the viewer has an active room with two seats
- **THEN** the page does not navigate and shows the Playing card for that room

#### Scenario: Match found redirects

- **WHEN** the viewer was queued on this page and an active room appears
- **THEN** the page navigates to that room

### Requirement: Remembered setup

Starting a match or room SHALL store the selected game, opponent, and clock. On the next visit /play SHALL preselect them, with a valid `?game=` taking precedence over the stored game.

#### Scenario: Stored setup preselected

- **WHEN** the stored setup is checkers, A friend, 10 min and /play opens without `?game=`
- **THEN** checkers, A friend, and 10 min are selected

### Requirement: Desktop layout

From the `lg` breakpoint, /play SHALL place the game cards in the main column and the opponent, clock, start, and status views in the sidebar. Below `lg` they SHALL stack in that order. Switching between setup, pending, waiting, queued, and active views SHALL record no layout-shift entries.

#### Scenario: Two columns at lg

- **WHEN** /play is viewed 1280px wide
- **THEN** the game cards and the start button sit side by side

#### Scenario: Queue view does not shift

- **WHEN** the user starts and cancels matchmaking
- **THEN** the layout-shift script records no entries
