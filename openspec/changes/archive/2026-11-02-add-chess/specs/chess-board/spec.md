## Purpose

Defines how a viewer sees and makes chess moves on the board: orientation per seat, selection with legal-move hints, the promotion picker, and the last-move and check marks.

## ADDED Requirements

### Requirement: Board orientation

The chess board SHALL be drawn from the viewer's side: seat 0 and spectators SHALL see white at the bottom, with a1 in the bottom-left corner. Seat 1 SHALL see black at the bottom, with h8 in the bottom-left corner.

#### Scenario: White seat

- **WHEN** the viewer in seat 0 opens a chess room
- **THEN** a1 is the bottom-left square and the white pieces are at the bottom

#### Scenario: Black seat

- **WHEN** the viewer in seat 1 opens a chess room
- **THEN** h8 is the bottom-left square and the black pieces are at the bottom

#### Scenario: Spectator

- **WHEN** a viewer who holds no seat opens a chess room
- **THEN** a1 is the bottom-left square

### Requirement: Selection hints legal destinations

On the viewer's own turn in the live position, choosing one of the viewer's pieces that has a legal move SHALL select it and hint every square it can legally move to. Choosing a piece with no legal move SHALL select nothing. Spectators, and players off their turn, SHALL NOT be able to select a piece.

#### Scenario: Knight at the start

- **WHEN** the viewer in seat 0 chooses the knight on g1 in the starting position
- **THEN** g1 is marked selected and exactly f3 and h3 are hinted

#### Scenario: Pinned piece

- **WHEN** the viewer chooses a piece pinned to its king that has no legal move
- **THEN** no square is selected or hinted

#### Scenario: Not the viewer's turn

- **WHEN** it is seat 1's turn and the viewer in seat 0 chooses one of its pieces
- **THEN** nothing is selected

### Requirement: Choosing a target

With a piece selected, choosing a hinted square SHALL send that move. Choosing another of the viewer's pieces that has a legal move SHALL select it instead. Choosing any other square, or the selected piece again, SHALL clear the selection and send no move.

#### Scenario: Hinted square

- **WHEN** the knight on g1 is selected and the viewer chooses f3
- **THEN** the move g1 to f3 is sent and the selection clears

#### Scenario: Reselect

- **WHEN** the knight on g1 is selected and the viewer chooses the pawn on e2
- **THEN** e2 is selected and e3 and e4 are hinted

#### Scenario: Square that is not hinted

- **WHEN** the knight on g1 is selected and the viewer chooses e5
- **THEN** no move is sent and nothing is selected

### Requirement: Promotion picker

Choosing a hinted square on the last rank with a pawn SHALL open a picker with Queen, Rook, Bishop, and Knight buttons instead of sending a move. Choosing a piece SHALL send the move with that promotion. Escape or a click outside the picker SHALL close it, send no move, and leave the pawn on its square.

#### Scenario: Promote to a knight

- **WHEN** the viewer moves a pawn from b7 to b8 and chooses Knight in the picker
- **THEN** the move b7 to b8 with a knight promotion is sent and b8 shows a knight

#### Scenario: Cancel the picker

- **WHEN** the picker is open and the viewer presses Escape
- **THEN** the picker closes, no move is sent, and the pawn is still on b7

#### Scenario: Picker from the keyboard

- **WHEN** the picker opens
- **THEN** focus is on the Queen button and Tab reaches the other three choices

### Requirement: Last move and check marks

The board SHALL mark the from and to squares of the last move in the shown position, and SHALL mark the king's square when the side to move in the shown position is in check. Both marks SHALL change only color.

#### Scenario: Castling marked

- **WHEN** seat 0 castles kingside
- **THEN** e1 and g1 are marked as the last move

#### Scenario: King in check

- **WHEN** a move puts the black king on e8 in check
- **THEN** e8 carries the check mark in both browsers

#### Scenario: Check while scrubbing

- **WHEN** the viewer steps back to a position where white was in check
- **THEN** the white king's square carries the check mark

### Requirement: Last move in SAN

The chess board SHALL expose the last move of the shown position in standard algebraic notation to assistive technology, as "Last move: " followed by the SAN, for example "Last move: Nxe5+". It SHALL add no visible element.

#### Scenario: Capture with check

- **WHEN** the last move is a knight capturing on e5 with check
- **THEN** the board's last-move text reads "Last move: Nxe5+"

#### Scenario: Castling and promotion

- **WHEN** the last move is a kingside castle, then in another round a pawn promoting to a queen on e8 with mate
- **THEN** the text reads "Last move: O-O", then "Last move: e8=Q#"
