# play-setup Specification

## Purpose

The /play page, where a signed-in player picks a game, an opponent, and a clock, then queues, creates a room, joins by code, or returns to their active game.

## Requirements

### Requirement: Game cards

/play SHALL show one card per game in a radiogroup. Arrow keys SHALL move the selection with wraparound, Home and End SHALL select the first and last card, and only the selected card SHALL be in the tab order. A valid `?game=` value SHALL preselect its card.

#### Scenario: Arrow key selects the next game

- **WHEN** the tic-tac-toe card is selected and has focus and the user presses ArrowRight
- **THEN** the checkers card is checked and focused

#### Scenario: Query preselects a game

- **WHEN** /play opens with `?game=checkers`
- **THEN** the checkers card is checked

### Requirement: Opponent choice

The opponent choice SHALL be a radiogroup offering "Anyone", "A friend", and "Open room", each described by a one-line hint. Anyone SHALL start matchmaking, A friend SHALL create a private room, and Open room SHALL create a public room.

#### Scenario: A friend creates a private room

- **WHEN** "A friend" is selected and the user presses Create room
- **THEN** the room is created with private visibility

### Requirement: Pending start

While a Find match or Create room call is in flight, its button SHALL be disabled and SHALL show a spinner with "Finding…" or "Creating…", without changing its size.

#### Scenario: Creating

- **WHEN** Create room is pressed and the call has not resolved
- **THEN** the button is disabled and reads "Creating…"

### Requirement: Waiting room

After a room is created on /play, the page SHALL show "Waiting for your opponent…" with the room code, Copy link, Cancel room, and Share where `navigator.share` exists. It SHALL stay until the second seat fills, then open the room. Cancel room SHALL abandon the room and return to setup.

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

While queued, /play SHALL show "Finding a match" with a Beacon, the game and clock, an mm:ss elapsed timer, "Play a friend instead", and Cancel. Cancel SHALL leave the queue. "Play a friend instead" SHALL leave the queue and select "A friend". Leaving /play while queued SHALL request leaving the queue.

#### Scenario: Elapsed timer format

- **WHEN** 75 seconds have passed since the queue view appeared
- **THEN** the timer reads `01:15`

#### Scenario: Leaving the page cancels the queue

- **WHEN** the user is queued and /play is torn down or the page fires `pagehide`
- **THEN** a queue cancel is requested

#### Scenario: Play a friend instead

- **WHEN** the user presses "Play a friend instead" while queued
- **THEN** a queue cancel is requested and "A friend" is selected

### Requirement: Remembered setup

Starting a match or room SHALL store the selected game, opponent, and clock. On the next visit /play SHALL preselect them, with a valid `?game=` taking precedence over the stored game.

#### Scenario: Stored setup preselected

- **WHEN** the stored setup is checkers, A friend, 10 min and /play opens without `?game=`
- **THEN** checkers, A friend, and 10 min are selected

### Requirement: Single card layout

/play SHALL show its controls in one centered card at every width. The waiting and queued views SHALL take the same area as the setup controls, centered in it, and the game and setup choices SHALL be hidden while they show. Switching between setup, pending, waiting, and queued views SHALL NOT change the card's height and SHALL record no layout-shift entries.

#### Scenario: Game choices hidden while queued

- **WHEN** the queue view shows
- **THEN** the game choices and the rest of the setup are hidden

#### Scenario: Queue view does not shift

- **WHEN** the user starts and cancels matchmaking
- **THEN** the card keeps its height and the layout-shift script records no entries

### Requirement: Signed-out prompt

When the visitor is signed out, /play SHALL show an in-page sign-in prompt with a Sign in button instead of the controls.

#### Scenario: Signed out

- **WHEN** a signed-out visitor opens /play
- **THEN** the page reads "Sign in to create or join a room." and shows an enabled Sign in button

### Requirement: Active game redirect

When a signed-in visitor requests /play, by direct load or client navigation, the server SHALL look up their active room with their session and SHALL redirect to `/<type>/<code>` when one exists, filled or waiting. A signed-out visitor, or a failed lookup, SHALL get the normal /play page.

#### Scenario: Active room redirects on the server

- **WHEN** a signed-in visitor whose active room is chess room `ABCD` requests /play
- **THEN** the server responds with a 307 redirect to `/chess/ABCD`

#### Scenario: Waiting room redirects on the server

- **WHEN** a signed-in visitor whose active room has only their seat requests /play
- **THEN** the server redirects to that room's route

#### Scenario: No active room renders the page

- **WHEN** a signed-in visitor with no active room requests /play
- **THEN** the server load returns without redirecting

#### Scenario: Signed out renders the page

- **WHEN** a signed-out visitor requests /play
- **THEN** the server load returns without calling Convex or redirecting

#### Scenario: Lookup failure renders the page

- **WHEN** the token or the `rooms.active` call throws
- **THEN** the server load returns without redirecting

### Requirement: Active game client fallback

If /play renders and then finds an active room it did not queue or create, it SHALL show the loading skeleton and navigate to that room, never the Playing card. When this page's queue entry or created room produces a filled room, the page SHALL navigate to it.

#### Scenario: Client fallback navigates to the room

- **WHEN** /play renders and `rooms.active` returns a room this page did not start
- **THEN** the loading skeleton shows, no Playing card renders, and the page navigates to the room

#### Scenario: Match found redirects

- **WHEN** the viewer was queued on this page and an active room appears
- **THEN** the page navigates to that room
