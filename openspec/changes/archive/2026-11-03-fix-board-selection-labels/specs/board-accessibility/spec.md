## MODIFIED Requirements

### Requirement: Checkers square labels

Each dark checkers square SHALL be named by its coordinate (files a–h left to right and ranks 1–8 bottom to top, from seat 0's side), then its piece ("cyan man", "pink king") or "empty", then "can capture" when that piece has a legal capture this turn, or "can move" when it has another legal move this turn. The selected piece's square SHALL say "selected" instead, and each legal destination of that piece SHALL add "move here".

#### Scenario: King that can capture

- **WHEN** a cyan king on e3 has a legal capture on the viewer's turn
- **THEN** its square is named "e3, cyan king, can capture"

#### Scenario: Empty square

- **WHEN** square d4 is empty
- **THEN** it is named "d4, empty"

#### Scenario: Selected checkers man

- **WHEN** the viewer in seat 0 selects the cyan man on a3 in the starting position
- **THEN** a3 is named "a3, cyan man, selected"

#### Scenario: Checkers move target

- **WHEN** the viewer in seat 0 has selected the cyan man on a3 in the starting position
- **THEN** b4 is named "b4, empty, move here"

#### Scenario: Checkers deselect

- **WHEN** the viewer in seat 0 selects the cyan man on a3 in the starting position and then clicks the empty square a5
- **THEN** a3 is named "a3, cyan man, can move" and b4 is named "b4, empty"

### Requirement: Chess square labels

Each chess square SHALL be named by its coordinate, then its piece by color and type ("white knight", "black queen") or "empty". An occupied square SHALL add "in check" when that king is in check, and "can move" when it is the viewer's turn and that piece has a legal move. The selected piece's square SHALL say "selected" instead of "can move", and each legal destination of that piece, empty or occupied, SHALL add "move here".

#### Scenario: Knight that can move

- **WHEN** it is the viewer's turn in seat 0 in the starting position
- **THEN** g1 is named "g1, white knight, can move" and a1 is named "a1, white rook"

#### Scenario: King in check

- **WHEN** the black king on e8 is in check and the viewer in seat 1 can move it
- **THEN** e8 is named "e8, black king, in check, can move"

#### Scenario: Empty chess square

- **WHEN** square e4 is empty
- **THEN** it is named "e4, empty"

#### Scenario: Selected knight

- **WHEN** the viewer in seat 0 selects the knight on g1 in the starting position
- **THEN** g1 is named "g1, white knight, selected"

#### Scenario: Empty chess target

- **WHEN** the viewer in seat 0 has selected the knight on g1 in the starting position
- **THEN** f3 is named "f3, empty, move here"

#### Scenario: Capture target

- **WHEN** the viewer in seat 0 has selected a white pawn on e4 and a black pawn stands on d5
- **THEN** d5 is named "d5, black pawn, move here"

#### Scenario: Chess deselect

- **WHEN** the viewer in seat 0 selects the knight on g1 in the starting position and then clicks g1 again
- **THEN** g1 is named "g1, white knight, can move" and f3 is named "f3, empty"

#### Scenario: Selected king in check

- **WHEN** the black king on e8 is in check and the viewer in seat 1 selects it
- **THEN** e8 is named "e8, black king, in check, selected"
