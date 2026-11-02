# move-replay Specification

## Purpose

Defines how a viewer steps through a round's moves with on-screen buttons, how the last move is marked on the board, and that the room's status keeps following the live game while the viewer looks at an earlier position.

## Requirements

### Requirement: Replay buttons

The round controls row SHALL hold four replay buttons, named "First move", "Previous move", "Next move", and "Live", around the action button. First and Previous SHALL be disabled at the first move or before any move. Next and Live SHALL be disabled while the board shows the live position.

#### Scenario: Step back and return

- **WHEN** three moves have been played and the viewer clicks "Previous move" and then "Live"
- **THEN** the board shows the position after move 2, then the live position

#### Scenario: Disabled at live

- **WHEN** the board shows the live position
- **THEN** "Next move" and "Live" are disabled

### Requirement: Last-move highlight

The board SHALL mark the squares of the last move in the shown position in the mover's seat color: the placed cell in tic-tac-toe, and the from and to squares of the last jump or step in checkers. While scrubbing, it SHALL mark the move at the shown position. It SHALL change only color, so no box changes.

#### Scenario: Tic-tac-toe last mark

- **WHEN** seat 1 places O in board 5, cell 3
- **THEN** that cell carries the seat 1 highlight in both browsers and no other cell does

#### Scenario: Checkers step

- **WHEN** seat 0 moves a piece from c3 to d4
- **THEN** c3 and d4 carry the seat 0 highlight

#### Scenario: While scrubbing

- **WHEN** the viewer steps back to move 1
- **THEN** only the squares of move 1 are highlighted

#### Scenario: Pending move

- **WHEN** the viewer's own move is still pending
- **THEN** its squares are highlighted at once

### Requirement: Live status while scrubbing

While the viewer scrubs history, the strips' status lines, the running clock, the announced status, the round controls' action, and the mood background SHALL follow the live round, not the shown position.

#### Scenario: Scrubbing a finished round

- **WHEN** the live round is over and the viewer steps back to move 2
- **THEN** the strips still read "Won" and "Lost", and the controls row still offers Rematch

#### Scenario: Scrubbing during play

- **WHEN** it is seat 1's live turn and the viewer steps back to a position where seat 0 was to move
- **THEN** seat 1's strip still reads "To move" or "Your turn" and seat 1's clock keeps running
