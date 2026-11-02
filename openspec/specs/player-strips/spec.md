# player-strips Specification

## Purpose

Defines how a game room shows its two players on phones and desktops: one player strip above the board for the opponent and one below for the viewer, each holding the player's emoji, name, seat mark, a status line, and clock, with the round controls below. Replaces the one-row status bar beside the board.

## Requirements

### Requirement: Strip order around the board

A game room SHALL render one player strip above the board and one below it. A seated viewer's own seat SHALL be the strip below the board and the opponent's seat the strip above. For a spectator, seat 0 SHALL be below and seat 1 above.

#### Scenario: Seat 0 viewer

- **WHEN** the viewer is seated in seat 0
- **THEN** the strip above the board shows seat 1 and the strip below shows seat 0

#### Scenario: Seat 1 viewer

- **WHEN** the viewer is seated in seat 1
- **THEN** the strip above the board shows seat 0 and the strip below shows seat 1

#### Scenario: Spectator

- **WHEN** the viewer is a spectator
- **THEN** the strip above the board shows seat 1 and the strip below shows seat 0

### Requirement: Strip content

Each strip SHALL show, on one line without wrapping: the player's emoji box, the player's name (truncated with an ellipsis when it does not fit), the seat mark in that seat's color (`text-seat-N`), a secondary status line, and the seat's clock in a monospace font with tabular figures. The viewer's own strip SHALL carry a "YOU" tag, and its emoji box SHALL open the trash-talk picker; every other emoji box SHALL be decorative.

#### Scenario: Own strip

- **WHEN** a seated viewer named "Alex" sees their own strip
- **THEN** it shows the name "Alex", a "YOU" tag, the seat mark in their seat color, and an emoji button named "Change your emoji"

#### Scenario: Opponent strip

- **WHEN** the same viewer sees the opponent's strip
- **THEN** it shows the opponent's name, emoji, seat mark, and clock, and has no "YOU" tag and no emoji button

#### Scenario: Spectator strips

- **WHEN** a spectator views the room
- **THEN** neither strip has a "YOU" tag or an emoji button

#### Scenario: Clock in the strip

- **WHEN** a seat has 65 seconds left
- **THEN** that seat's strip shows `1:05` in an element with monospace and tabular-figure classes

### Requirement: Strip status line

Each strip's secondary line SHALL show exactly one of: "Reconnecting…" (a quiet opponent mid-round), "You must capture" (the viewer's checkers turn when every move captures), "Your turn", "To move" (another strip's turn), "Waiting" (seat 1 before an opponent joins), "Won", "Lost", or "Draw" (round over), or the seat's match score. A closed waiting room SHALL leave seat 1's line blank.

#### Scenario: Viewer's turn

- **WHEN** it is seat 0's turn and the viewer is seated in seat 0
- **THEN** the lower strip's line reads "Your turn" and the upper strip's line shows seat 1's score

#### Scenario: Opponent's turn for a spectator

- **WHEN** a spectator views a room where it is seat 1's turn
- **THEN** the upper strip's line reads "To move" and the lower strip's line shows seat 0's score

#### Scenario: Round over

- **WHEN** seat 1 wins the round
- **THEN** seat 1's line reads "Won" and seat 0's line reads "Lost"

#### Scenario: Waiting for an opponent

- **WHEN** the room is waiting for a second player
- **THEN** seat 1's line reads "Waiting"

#### Scenario: Forced capture

- **WHEN** it is the viewer's checkers turn and every legal move is a capture
- **THEN** the viewer's strip line reads "You must capture" and the opponent's strip shows no such line

#### Scenario: Spectator sees no capture prompt

- **WHEN** a spectator watches a checkers turn where every legal move is a capture
- **THEN** the mover's strip line reads "To move"

### Requirement: Status announced once

The room SHALL expose exactly one `role="status"` element for the game status, whose text is the current status, such as "Your turn", "Your turn. You must capture.", "Alex's turn", "You won", "Draw", "Waiting for an opponent", or empty for a closed room. The strips' visual status labels SHALL be hidden from assistive technology. A hidden disconnect announcement SHALL be the only other `role="status"` element.

#### Scenario: One status region

- **WHEN** a room renders on seat 1's turn for a viewer in seat 0 and seat 1 is "Blair"
- **THEN** exactly one game status element reads "Blair's turn", the disconnect announcement is empty, and the strip labels are `aria-hidden`

### Requirement: Board fills the width on phones

The board area SHALL have no emoji columns beside it. Below the `sm` breakpoint, the board and both strips SHALL share one width taken from the available content width and height, and the board SHALL be at least 300px wide at a 360x640 viewport. At 360px wide, the space available to each strip's name SHALL be at least `8ch` wide.

#### Scenario: Names readable at 360px

- **WHEN** a seated player views a live room at 360x640 with names "Alexandra" and "Blairwood"
- **THEN** the space available to each strip's name (its flexible container, excluding the seat mark, tag, and clock) is at least 8 times the rendered width of the digit "0" in its font, and at least the first 8 characters of each name are visible

#### Scenario: Board width at 360px

- **WHEN** a seated player views a live room at 360x640
- **THEN** the board area is at least 300px wide and the strips are as wide as the board

### Requirement: Round controls below the board

Below `lg`, a round controls row SHALL render below the lower strip with, in order: "First move", "Previous move", the round action (Resign, Rematch, Abandon, Go live, or Play again) or a spectator's "Spectating" pill, "Next move", and "Live", followed by a notice line, with no clocks. The round counter and navigation SHALL render in the room bar. From `lg`, the replay buttons, round action, and notice line SHALL render at the bottom of the side panel instead.

#### Scenario: Controls under the lower strip

- **WHEN** a live round renders at 360x640
- **THEN** the round controls row and the notice line follow the lower strip in document order, and the controls row contains no clock and no round counter

#### Scenario: Spectator pill

- **WHEN** a spectator views a live round
- **THEN** the action slot shows a "Spectating" pill and no disabled Resign, Rematch, or Abandon button

#### Scenario: Rematch in one click

- **WHEN** a round has ended, the viewer has hidden the result card with "View board", and clicks Rematch in the controls row
- **THEN** the rematch request is sent with no menu in between

### Requirement: Same strips on desktop

At `sm` and wider, the room SHALL render the same two strips above and below the board at the board's width.

#### Scenario: Strips at 1280px

- **WHEN** a seated player views a live room at 1280x800
- **THEN** one strip is above the board, one is below, and both are as wide as the board

### Requirement: Resign and Abandon need confirmation

Choosing Resign or Abandon from the round action menu SHALL ask for confirmation ("Resign this round?" or "Leave and close this room?") with a confirm and a Cancel button, and SHALL send the request only on confirm.

#### Scenario: Cancel a resignation

- **WHEN** a seated viewer chooses Resign and then Cancel
- **THEN** no resign request is sent and the round continues

#### Scenario: Confirm a resignation

- **WHEN** a seated viewer chooses Resign and then confirms
- **THEN** one resign request is sent

### Requirement: Disconnect notice

While a seated viewer's opponent has gone quiet during play, the opponent's strip SHALL read "Reconnecting…" with an amber dot that pulses only when motion is allowed, and its emoji, name, and clock SHALL dim by opacity inside the strip's fixed box. A visually hidden `role="status"` element SHALL announce "<name> disconnected". The notice line SHALL carry only the room error, as a compact inline alert, and SHALL keep its box while empty. A finished round keeps its result line.

#### Scenario: Opponent drops

- **WHEN** the viewer is seated and opponent "Alex" has not sent a heartbeat for over 30 seconds during play
- **THEN** Alex's strip line reads "Reconnecting…", the strip dims, a `role="status"` element reads "Alex disconnected", the notice line stays empty, and no layout-shift entry is recorded

#### Scenario: Opponent returns

- **WHEN** Alex's heartbeat arrives again
- **THEN** Alex's strip shows its usual line at full opacity and the announcement is empty

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is emulated and the opponent drops
- **THEN** the amber dot holds still
