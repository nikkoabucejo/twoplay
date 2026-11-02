## MODIFIED Requirements

### Requirement: Pending move shows at once

When a seated viewer makes a legal move in the live round, the room SHALL show the resulting position before the server answers: the new mark or piece, the turn passing to the opponent (status, turn ring, and move gating), and the move sound, played once. Only the viewer's own moves SHALL be shown ahead of the server. The server SHALL still validate every move as it does today.

#### Scenario: Tic-tac-toe mark before the server answers

- **WHEN** the viewer in seat 0 plays board 0, cell 0 and the play request is held pending
- **THEN** the cell shows X, it is no longer the viewer's turn, the active seat is 1, and no other cell can be played

#### Scenario: Checkers piece before the server answers

- **WHEN** the viewer in seat 0 moves a piece with a simple move and the play request is held pending
- **THEN** the piece shows on its destination square, its source square is empty, and the active seat is 1

#### Scenario: Chess move before the server answers

- **WHEN** the viewer in seat 0 plays e2 to e4 and the play request is held pending
- **THEN** the pawn shows on e4, e2 is empty, the active seat is 1, and no white piece can be selected

#### Scenario: Chess promotion before the server answers

- **WHEN** the viewer promotes a pawn on b8 to a knight and the play request is held pending
- **THEN** b8 shows a knight and b7 is empty

#### Scenario: Spectator sees only confirmed moves

- **WHEN** a spectator views a room while a seated player's move is in flight
- **THEN** the spectator's board changes only when the server state changes

#### Scenario: Throttled network in two browsers

- **WHEN** `browser-a` is throttled to at least 1 second of added latency and its seated player places a mark
- **THEN** the mark, the turn ring on the opponent's strip, and the move sound appear in `browser-a` at once, and `browser-b` shows the mark once the server commits it
