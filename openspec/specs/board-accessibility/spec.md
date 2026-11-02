# board-accessibility Specification

## Purpose

Defines how the tic-tac-toe and checkers boards are exposed to assistive technology and the keyboard: valid roles, cell labels, arrow-key movement inside the board, and which keys scrub move history.

## Requirements

### Requirement: Valid board roles

Each board SHALL be a `group` named for its game. Each tic-tac-toe mini-board SHALL be a `group` named by its number and position. Playable squares SHALL be buttons. Light checkers squares SHALL be plain elements hidden from assistive technology. No board SHALL use the `grid` role.

#### Scenario: Tic-tac-toe roles

- **WHEN** a tic-tac-toe room renders
- **THEN** one `group` is named "Tic-tac-toe board", it holds nine `group`s named "Board 1 (top left)" through "Board 9 (bottom right)", each with nine buttons, and no element has role `grid`

#### Scenario: Checkers roles

- **WHEN** a checkers room renders
- **THEN** the "Checkers board" `group` holds exactly 32 buttons, one per dark square, and the 32 light squares are not buttons and are `aria-hidden`

### Requirement: Tic-tac-toe cell labels

Each tic-tac-toe cell button SHALL be named "Board B (position), cell C — " followed by its content: "empty, playable" when the viewer may play it now, "empty", "X", or "O".

#### Scenario: Playable center cell

- **WHEN** it is the viewer's turn and cell 3 of the center board is empty and allowed
- **THEN** that button is named "Board 5 (center), cell 3 — empty, playable"

#### Scenario: Taken cell

- **WHEN** cell 1 of board 1 holds O
- **THEN** that button is named "Board 1 (top left), cell 1 — O"

### Requirement: Checkers square labels

Each dark checkers square SHALL be named by its coordinate (files a–h left to right and ranks 1–8 bottom to top, from seat 0's side), then its piece ("cyan man", "pink king") or "empty", then "can capture" when that piece has a legal capture this turn, or "can move" when it has another legal move this turn.

#### Scenario: King that can capture

- **WHEN** a cyan king on e3 has a legal capture on the viewer's turn
- **THEN** its square is named "e3, cyan king, can capture"

#### Scenario: Empty square

- **WHEN** square d4 is empty
- **THEN** it is named "d4, empty"

### Requirement: Roving focus inside the board

Exactly one square of a board SHALL be in the tab order. While a square has focus, the arrow keys SHALL move focus to the adjacent square in that direction as drawn on screen, stopping at the edges, and Home and End SHALL move to the first and last square. In tic-tac-toe, arrows SHALL cross mini-board edges as one 9x9 grid. In checkers, arrows SHALL move between dark squares only.

#### Scenario: One tab stop

- **WHEN** the viewer tabs into a tic-tac-toe board
- **THEN** focus lands on one cell and the next Tab leaves the board

#### Scenario: Crossing mini-boards

- **WHEN** cell 3 of board 1 has focus and the viewer presses ArrowRight
- **THEN** cell 1 of board 2 has focus and the move history position is unchanged

#### Scenario: Checkers skips light squares

- **WHEN** a viewer in seat 0 has focus on the dark square a1 and presses ArrowRight
- **THEN** c1 has focus

### Requirement: Scrubbing keys

While focus is outside the board and not in a text field, ArrowLeft and ArrowRight SHALL step back and forward through the round's moves, ArrowDown SHALL jump to the first move, and ArrowUp SHALL return to live. `[` and `]` SHALL step back and forward from anywhere outside a text field, including inside the board.

#### Scenario: Arrow outside the board

- **WHEN** focus is on the page body and the viewer presses ArrowLeft after three moves
- **THEN** the board shows the position after move 2

#### Scenario: Bracket inside the board

- **WHEN** a board square has focus and the viewer presses `[`
- **THEN** the board steps back one move and focus stays on the square
