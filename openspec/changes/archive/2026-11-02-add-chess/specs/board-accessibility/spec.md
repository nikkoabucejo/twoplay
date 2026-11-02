## MODIFIED Requirements

### Requirement: Valid board roles

Each board SHALL be a `group` named for its game. Each tic-tac-toe mini-board SHALL be a `group` named by its number and position. Playable squares SHALL be buttons. Light checkers squares SHALL be plain elements hidden from assistive technology. Every chess square SHALL be a button. No board SHALL use the `grid` role.

#### Scenario: Tic-tac-toe roles

- **WHEN** a tic-tac-toe room renders
- **THEN** one `group` is named "Tic-tac-toe board", it holds nine `group`s named "Board 1 (top left)" through "Board 9 (bottom right)", each with nine buttons, and no element has role `grid`

#### Scenario: Checkers roles

- **WHEN** a checkers room renders
- **THEN** the "Checkers board" `group` holds exactly 32 buttons, one per dark square, and the 32 light squares are not buttons and are `aria-hidden`

#### Scenario: Chess roles

- **WHEN** a chess room renders
- **THEN** the "Chess board" `group` holds exactly 64 buttons, one per square, and no element has role `grid`

### Requirement: Roving focus inside the board

Exactly one square of a board SHALL be in the tab order. While a square has focus, the arrow keys SHALL move focus to the adjacent square in that direction as drawn on screen, stopping at the edges, and Home and End SHALL move to the first and last square. In tic-tac-toe, arrows SHALL cross mini-board edges as one 9x9 grid. In checkers, arrows SHALL move between dark squares only. In chess, arrows SHALL move across all 64 squares, following the board's orientation for the viewer.

#### Scenario: One tab stop

- **WHEN** the viewer tabs into a tic-tac-toe board
- **THEN** focus lands on one cell and the next Tab leaves the board

#### Scenario: Crossing mini-boards

- **WHEN** cell 3 of board 1 has focus and the viewer presses ArrowRight
- **THEN** cell 1 of board 2 has focus and the move history position is unchanged

#### Scenario: Checkers skips light squares

- **WHEN** a viewer in seat 0 has focus on the dark square a1 and presses ArrowRight
- **THEN** c1 has focus

#### Scenario: Chess as drawn for black

- **WHEN** a viewer in seat 1 has focus on e2 and presses ArrowRight, then ArrowUp
- **THEN** d2 has focus, then d1

## ADDED Requirements

### Requirement: Chess square labels

Each chess square SHALL be named by its coordinate, then its piece by color and type ("white knight", "black queen") or "empty". An occupied square SHALL add "in check" when that king is in check, and "can move" when it is the viewer's turn and that piece has a legal move.

#### Scenario: Knight that can move

- **WHEN** it is the viewer's turn in seat 0 in the starting position
- **THEN** g1 is named "g1, white knight, can move" and a1 is named "a1, white rook"

#### Scenario: King in check

- **WHEN** the black king on e8 is in check and the viewer in seat 1 can move it
- **THEN** e8 is named "e8, black king, in check, can move"

#### Scenario: Empty chess square

- **WHEN** square e4 is empty
- **THEN** it is named "e4, empty"
