# Spec Delta

## Purpose

Defines how a game room shows its two players on phones and desktops: one player strip above the board for the opponent and one below for the viewer, each holding the player's emoji, name, seat mark, a status line, and clock, with the round controls below. Replaces the one-row status bar beside the board.

## ADDED Requirements

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

Each strip's secondary line SHALL show exactly one of: "Your turn" (the viewer's own strip on the viewer's turn), "To move" (any other strip whose turn it is), "Waiting" (seat 1 while the room waits for an opponent), "Won", "Lost", or "Draw" (when the round is over), or the seat's match score otherwise. A closed waiting room SHALL leave seat 1's line blank.

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

### Requirement: Turn ring

The strip whose seat is to move SHALL be outlined by a ring in that seat's color. No strip SHALL show the ring while the round is over or the room is waiting.

#### Scenario: Ring follows the turn

- **WHEN** the status changes from seat 0's turn to seat 1's turn
- **THEN** seat 1's strip shows the ring in the seat 1 color and seat 0's strip shows none

#### Scenario: No ring after the round

- **WHEN** the round ends in a draw
- **THEN** neither strip shows the ring

### Requirement: Status announced once

The room SHALL expose exactly one `role="status"` element whose text is the current status ("Your turn", "Alex's turn", "You won", "Alex won", "Draw", "Waiting for an opponent", or empty for a closed room). Every visual status label in the strips SHALL be hidden from assistive technology.

#### Scenario: One status region

- **WHEN** a room renders on seat 1's turn for a viewer in seat 0 and seat 1 is "Blair"
- **THEN** exactly one element has role `status`, its text is "Blair's turn", and the strip labels are `aria-hidden`

### Requirement: Board fills the width on phones

The board area SHALL have no emoji columns beside it. Below the `sm` breakpoint, the board and both strips SHALL share one width taken from the available content width and height, and the board SHALL be at least 300px wide at a 360x640 viewport. At 360px wide, the space available to each strip's name SHALL be at least `8ch` wide.

#### Scenario: Names readable at 360px

- **WHEN** a seated player views a live room at 360x640 with names "Alexandra" and "Blairwood"
- **THEN** the space available to each strip's name (its flexible container, excluding the seat mark, tag, and clock) is at least 8 times the rendered width of the digit "0" in its font, and at least the first 8 characters of each name are visible

#### Scenario: Board width at 360px

- **WHEN** a seated player views a live room at 360x640
- **THEN** the board area is at least 300px wide and the strips are as wide as the board

### Requirement: Round controls below the board

The previous-round and next-round buttons, the round action button (Resign, Rematch, Abandon, Go live, or Play again), the round counter, and the error slot SHALL render below the lower strip. Clocks SHALL NOT render in the round controls row.

#### Scenario: Controls under the lower strip

- **WHEN** a live round renders
- **THEN** the round controls row, the "Round N of M" counter, and the error slot follow the lower strip in document order, and the controls row contains no clock

### Requirement: Same strips on desktop

At `sm` and wider, the room SHALL render the same two strips above and below the board at the board's width.

#### Scenario: Strips at 1280px

- **WHEN** a seated player views a live room at 1280x800
- **THEN** one strip is above the board, one is below, and both are as wide as the board
