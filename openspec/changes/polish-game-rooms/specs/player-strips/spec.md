# Spec Delta

## MODIFIED Requirements

### Requirement: Strip status line

Each strip's secondary line SHALL show exactly one of: "Reconnecting…" (the opponent's strip, for a seated viewer, while the round is in play and that seat has gone quiet), "You must capture" (the viewer's own strip on the viewer's live checkers turn when every legal move is a capture), "Your turn" (the viewer's own strip on the viewer's turn otherwise), "To move" (any other strip whose turn it is), "Waiting" (seat 1 while the room waits for an opponent), "Won", "Lost", or "Draw" (when the round is over), or the seat's match score otherwise. A closed waiting room SHALL leave seat 1's line blank.

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

The room SHALL expose exactly one `role="status"` element for the game status, whose text is the current status ("Your turn", "Your turn. You must capture." on the viewer's checkers turn when every legal move is a capture, "Alex's turn", "You won", "Alex won", "Draw", "Waiting for an opponent", or empty for a closed room). Every visual status label in the strips SHALL be hidden from assistive technology. A visually hidden disconnect announcement SHALL be the only other `role="status"` element in the room.

#### Scenario: One status region

- **WHEN** a room renders on seat 1's turn for a viewer in seat 0 and seat 1 is "Blair"
- **THEN** exactly one game status element reads "Blair's turn", the disconnect announcement is empty, and the strip labels are `aria-hidden`

### Requirement: Round controls below the board

Below the `lg` breakpoint, the round controls row SHALL render below the lower strip and hold, in order: the "First move" and "Previous move" buttons, the round action (Resign, Rematch, Abandon, Go live, or Play again) or, for a spectator, a "Spectating" pill, then the "Next move" and "Live" buttons. A notice line SHALL follow it. Clocks SHALL NOT render in the round controls row. The round counter and round navigation SHALL render in the room bar. From `lg`, the replay buttons, the round action, and the notice line SHALL render at the bottom of the side panel instead, and nothing SHALL render below the lower strip.

#### Scenario: Controls under the lower strip

- **WHEN** a live round renders at 360x640
- **THEN** the round controls row and the notice line follow the lower strip in document order, and the controls row contains no clock and no round counter

#### Scenario: Spectator pill

- **WHEN** a spectator views a live round
- **THEN** the action slot shows a "Spectating" pill and no disabled Resign, Rematch, or Abandon button

#### Scenario: Rematch in one click

- **WHEN** a seated viewer clicks Rematch in the controls row after a round ends
- **THEN** the rematch request is sent with no menu in between

## ADDED Requirements

### Requirement: Resign and Abandon need confirmation

Choosing Resign or Abandon from the round action menu SHALL ask for confirmation ("Resign this round?" or "Leave and close this room?") with a confirm and a Cancel button, and SHALL send the request only on confirm.

#### Scenario: Cancel a resignation

- **WHEN** a seated viewer chooses Resign and then Cancel
- **THEN** no resign request is sent and the round continues

#### Scenario: Confirm a resignation

- **WHEN** a seated viewer chooses Resign and then confirms
- **THEN** one resign request is sent

### Requirement: Disconnect notice

While a seated viewer's opponent has gone quiet during play, the opponent's strip SHALL read "Reconnecting…" with a small amber dot that pulses only when motion is allowed, and the strip's emoji, name, and clock SHALL dim by opacity, all inside the strip's fixed box. A visually hidden `role="status"` element SHALL announce "<name> disconnected". The notice line under the controls SHALL carry only the room error, shown as a compact inline alert with a destructive tint and an icon, and SHALL keep its box while empty. A finished round keeps its result line. Phones and desktops get the same strip treatment.

#### Scenario: Opponent drops

- **WHEN** the viewer is seated and opponent "Alex" has not sent a heartbeat for over 30 seconds during play
- **THEN** Alex's strip line reads "Reconnecting…", the strip dims, a `role="status"` element reads "Alex disconnected", the notice line stays empty, and no layout-shift entry is recorded

#### Scenario: Opponent returns

- **WHEN** Alex's heartbeat arrives again
- **THEN** Alex's strip shows its usual line at full opacity and the announcement is empty

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is emulated and the opponent drops
- **THEN** the amber dot holds still

## REMOVED Requirements

### Requirement: Turn ring

**Reason**: A seat-colored outline that moves between strips with every turn is distracting. Strips keep one neutral border.

**Migration**: The turn is shown by the strip's status line ("Your turn" or "To move") and the running clock's seat tint.
