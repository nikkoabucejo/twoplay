# optimistic-moves Specification

## Purpose

Shows a seated viewer's own tic-tac-toe or checkers move the moment it is made, as a pending move, and reconciles it with the server, which stays the sole authority: the server's state replaces the pending move once it arrives, and a move the server rejects is rolled back.

## Requirements

### Requirement: Pending move shows at once

When a seated viewer makes a legal move in the live round, the room SHALL show the resulting position before the server answers: the new mark or piece, the turn passing to the opponent (status, turn ring, and move gating), and the move sound, played once. Only the viewer's own moves SHALL be shown ahead of the server. The server SHALL still validate every move as it does today.

#### Scenario: Tic-tac-toe mark before the server answers

- **WHEN** the viewer in seat 0 plays board 0, cell 0 and the play request is held pending
- **THEN** the cell shows X, it is no longer the viewer's turn, the active seat is 1, and no other cell can be played

#### Scenario: Checkers piece before the server answers

- **WHEN** the viewer in seat 0 moves a piece with a simple move and the play request is held pending
- **THEN** the piece shows on its destination square, its source square is empty, and the active seat is 1

#### Scenario: Spectator sees only confirmed moves

- **WHEN** a spectator views a room while a seated player's move is in flight
- **THEN** the spectator's board changes only when the server state changes

#### Scenario: Throttled network in two browsers

- **WHEN** `browser-a` is throttled to at least 1 second of added latency and its seated player places a mark
- **THEN** the mark, the turn ring on the opponent's strip, and the move sound appear in `browser-a` at once, and `browser-b` shows the mark once the server commits it

### Requirement: Confirmation replaces the pending move without a replay

A pending move SHALL be dropped when the server's room state reflects it or when the play request resolves, and the board SHALL then show the server's state. Confirmation SHALL NOT remove and re-add the mark or piece, and SHALL NOT replay its sound or entry animation. A play request that resolves with the state unchanged SHALL clear the pending move without an error or toast. A server update that leaves the game state unchanged SHALL keep the pending move.

#### Scenario: Server catches up

- **WHEN** a tic-tac-toe move is pending and the room query then returns the state with that mark
- **THEN** no move is pending, the cell still shows the same mark element, and the move sound has played exactly once

#### Scenario: No-op result

- **WHEN** a pending move's play request resolves while the room state is unchanged
- **THEN** the pending move is gone, the board shows the server state, no toast is shown, and the room error stays empty

#### Scenario: Unrelated room update while pending

- **WHEN** a move is pending and the room query returns a new snapshot whose game state is unchanged (for example, a heartbeat updated a player's last-seen time)
- **THEN** the pending move is still shown

### Requirement: Rejected moves roll back

When the server rejects a pending move, the room SHALL remove that move and every pending move made after it, show the server's state, show one error toast, and shake the board. A rejected move SHALL NOT set the room's footer error message.

#### Scenario: Rejected tic-tac-toe move

- **WHEN** a pending tic-tac-toe move's play request rejects
- **THEN** the cell is empty again, it is the viewer's turn again, one error toast reading "Move not accepted" is shown, the board shakes, and the footer error slot is empty

#### Scenario: Rejection rolls back the moves after it

- **WHEN** two checkers jumps are pending and the first one's play request rejects
- **THEN** neither jump is shown and the board shows the server state

#### Scenario: Opponent resigns while a move is in flight

- **WHEN** `browser-a` is throttled, its player moves, and the player in `browser-b` resigns before the move reaches the server
- **THEN** `browser-a` removes the move, shows the "Move not accepted" toast, shakes the board, and shows the resignation result

### Requirement: Clock handoff while a move is pending

While a move that passes the turn is pending, the viewer's clock SHALL stop at the time it showed when the move was made, and the opponent's clock SHALL count down from that moment. When the server's clock values arrive they SHALL replace both. The automatic timeout claim SHALL use only the server's clock values and turn.

#### Scenario: Clocks hand off locally

- **WHEN** both seats have 60 seconds banked, the viewer's clock started 10 seconds ago, the viewer moves with the play request held, and 5 more seconds pass
- **THEN** the viewer's clock shows 50 seconds and the opponent's shows 55 seconds

#### Scenario: Opponent's predicted clock reaching zero

- **WHEN** a move is pending and the opponent's locally ticking clock reaches zero
- **THEN** no timeout claim is sent

#### Scenario: Server values replace the local handoff

- **WHEN** a pending move is confirmed and the server reports new remaining times
- **THEN** both clocks show the server's values

### Requirement: Checkers jumps chain while pending

After a pending checkers capture that must continue, the viewer SHALL be able to make the next jump at once, before the first is confirmed. Each jump SHALL be sent to the server in the order it was made.

#### Scenario: Double jump before confirmation

- **WHEN** the viewer makes a capture that must continue and the play request is held pending
- **THEN** the capturing piece stays selected, its next jump is offered, and making it sends a second play request after the first

### Requirement: Pending moves, history, and rounds

Moves SHALL stay blocked while the viewer is reviewing history, and the history view SHALL show only server moves. When the room's round changes, moves pending from the earlier round SHALL be dropped without a toast.

#### Scenario: Scrubbing during a pending move

- **WHEN** a move is pending and the viewer steps back one move
- **THEN** the board shows the server's history snapshot without the pending move, and returning to live shows the pending move again

#### Scenario: New round while a move is pending

- **WHEN** a move is pending and the room query returns a new round number
- **THEN** no move is pending and the board shows the new round's server state
