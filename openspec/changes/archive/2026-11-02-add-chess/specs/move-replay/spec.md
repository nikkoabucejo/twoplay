## MODIFIED Requirements

### Requirement: Last-move highlight

The board SHALL mark the squares of the last move in the shown position in the mover's seat color: the placed cell in tic-tac-toe, the from and to squares of the last jump or step in checkers, and the from and to squares of the last move in chess (the king's squares when castling). While scrubbing, it SHALL mark the move at the shown position. It SHALL change only color, so no box changes.

#### Scenario: Tic-tac-toe last mark

- **WHEN** seat 1 places O in board 5, cell 3
- **THEN** that cell carries the seat 1 highlight in both browsers and no other cell does

#### Scenario: Checkers step

- **WHEN** seat 0 moves a piece from c3 to d4
- **THEN** c3 and d4 carry the seat 0 highlight

#### Scenario: Chess move

- **WHEN** seat 1 moves a pawn from e7 to e5
- **THEN** e7 and e5 carry the seat 1 highlight in both browsers and no other square does

#### Scenario: While scrubbing

- **WHEN** the viewer steps back to move 1
- **THEN** only the squares of move 1 are highlighted

#### Scenario: Pending move

- **WHEN** the viewer's own move is still pending
- **THEN** its squares are highlighted at once
