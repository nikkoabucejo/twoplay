## Purpose

Defines the chess rules the server enforces: seat colors, which moves are legal, and how a round ends in checkmate, a draw, or a timeout.

## ADDED Requirements

### Requirement: Seat colors and turn order

In a chess round, seat 0 SHALL play white and seat 1 SHALL play black. White SHALL move first, and turns SHALL alternate. A move sent by the seat whose turn it is not SHALL be rejected with "Not your turn".

#### Scenario: White moves first

- **WHEN** a chess round starts
- **THEN** the position is the standard starting position and seat 0 is to move

#### Scenario: Move out of turn

- **WHEN** seat 1 sends e7 to e5 in the starting position
- **THEN** the move is rejected with "Not your turn" and the position is unchanged

### Requirement: Only legal moves are accepted

The server SHALL accept a chess move only when it is legal under FIDE rules in the current position. A move SHALL be legal only if it leaves the mover's own king out of check. An illegal move SHALL leave the game state, the move list, and the clocks unchanged.

#### Scenario: Piece moved the wrong way

- **WHEN** seat 0 sends e2 to e5 in the starting position
- **THEN** the position, the move list, and the clocks are unchanged

#### Scenario: Pinned piece

- **WHEN** white's knight on e2 is pinned to the king on e1 by a black rook on e8, and seat 0 sends e2 to c3
- **THEN** the move is not applied

#### Scenario: Ignoring check

- **WHEN** white is in check and seat 0 sends a move that leaves the king in check
- **THEN** the move is not applied

#### Scenario: Moving the opponent's piece

- **WHEN** it is white's turn and seat 0 sends e7 to e5
- **THEN** the move is not applied

### Requirement: Castling

A king SHALL castle kingside or queenside by moving two squares toward a rook, with the rook moving to the square the king crossed. Castling SHALL be legal only when neither piece has moved, the squares between them are empty, and the king is not in check, does not cross an attacked square, and does not land on one.

#### Scenario: Kingside castle

- **WHEN** the position is `r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1` and seat 0 sends e1 to g1
- **THEN** the white king is on g1 and the white rook is on f1

#### Scenario: Queenside castle

- **WHEN** the position is `r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1` and seat 0 sends e1 to c1
- **THEN** the white king is on c1 and the white rook is on d1

#### Scenario: Out of check

- **WHEN** the position is `4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1` and seat 0 sends e1 to g1
- **THEN** the move is not applied

#### Scenario: Through an attacked square

- **WHEN** the position is `5rk1/8/8/8/8/8/8/R3K2R w KQ - 0 1` and seat 0 sends e1 to g1
- **THEN** the move is not applied

#### Scenario: After the king has moved

- **WHEN** the white king has moved from e1 and back, and seat 0 sends e1 to g1 with f1 and g1 empty
- **THEN** the move is not applied

### Requirement: En passant

A pawn SHALL be able to capture an enemy pawn that has just advanced two squares past it, moving to the square that pawn crossed and removing it. The capture SHALL be legal only on the move right after the double step.

#### Scenario: Capture right after the double step

- **WHEN** after 1. e4 a6 2. e5 d5, seat 0 sends e5 to d6
- **THEN** the white pawn is on d6 and d5 is empty

#### Scenario: Too late

- **WHEN** after 1. e4 a6 2. e5 d5 3. h3 h6, seat 0 sends e5 to d6
- **THEN** the move is not applied

### Requirement: Promotion

A pawn move to the last rank SHALL name a promotion piece: queen, rook, bishop, or knight. The pawn SHALL be replaced by that piece. A move to the last rank without a promotion piece, or a move that names a promotion piece when it is not a promotion, SHALL be rejected.

#### Scenario: Promote to each piece

- **WHEN** the position is `8/P6k/8/8/8/8/8/K7 w - - 0 1` and seat 0 sends a7 to a8 with queen, rook, bishop, or knight
- **THEN** a8 holds a white piece of that type and a7 is empty

#### Scenario: Missing promotion piece

- **WHEN** the position is `8/P6k/8/8/8/8/8/K7 w - - 0 1` and seat 0 sends a7 to a8 with no promotion piece
- **THEN** the move is not applied

#### Scenario: Promotion piece on an ordinary move

- **WHEN** seat 0 sends e2 to e4 with a promotion to queen in the starting position
- **THEN** the move is not applied

### Requirement: Checkmate ends the round

When the side to move is in check and has no legal move, the round SHALL end and the other seat SHALL win.

#### Scenario: Fool's mate

- **WHEN** the moves are 1. f3 e5 2. g4 Qh4
- **THEN** the round is over and seat 1 wins

### Requirement: Stalemate is a draw

When the side to move is not in check and has no legal move, the round SHALL end as a draw with no winner.

#### Scenario: Stalemate

- **WHEN** the position is `7k/4Q3/6K1/8/8/8/8/8 w - - 0 1` and seat 0 sends e7 to f7
- **THEN** the round is over with no winner

### Requirement: Insufficient material is a draw

The round SHALL end as a draw with no winner as soon as neither side can checkmate: king against king, king and one bishop or one knight against king, or kings with bishops where every bishop stands on the same square color. No player action SHALL be needed.

#### Scenario: King against king

- **WHEN** a capture leaves only the two kings
- **THEN** the round is over with no winner

#### Scenario: King and minor piece against king

- **WHEN** a move leaves one side with a king and one knight, or a king and one bishop, and the other side with a king alone
- **THEN** the round is over with no winner

#### Scenario: Same-colored bishops

- **WHEN** a move leaves each side a king and one bishop, both bishops on dark squares
- **THEN** the round is over with no winner

#### Scenario: Opposite-colored bishops play on

- **WHEN** a move leaves each side a king and one bishop, one on a light square and one on a dark square
- **THEN** the round continues

### Requirement: Threefold repetition is a draw

The round SHALL end as a draw with no winner when the same position occurs for the third time. Positions SHALL count as the same when the pieces, the side to move, the castling rights, and the en passant square all match. No player action SHALL be needed.

#### Scenario: Knights out and back twice

- **WHEN** the moves are 1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8
- **THEN** the round is over with no winner

#### Scenario: Two occurrences play on

- **WHEN** the moves are 1. Nf3 Nf6 2. Ng1 Ng8
- **THEN** the round continues

### Requirement: Fifty-move rule is a draw

The round SHALL end as a draw with no winner when 50 moves by each side have been played with no capture and no pawn move. No player action SHALL be needed.

#### Scenario: Hundredth quiet half-move

- **WHEN** the position is `8/8/8/4k3/8/8/R7/4K3 w - - 99 80` and seat 0 sends a2 to a3
- **THEN** the round is over with no winner

#### Scenario: One short

- **WHEN** the position is `8/8/8/4k3/8/8/R7/4K3 w - - 98 80` and seat 0 sends a2 to a3
- **THEN** the round continues

### Requirement: Repetition history stays bounded

The state SHALL keep only the positions since the last capture or pawn move. A capture or pawn move SHALL clear that history, so positions before it never count toward a repetition, and the history SHALL hold at most 101 positions.

#### Scenario: Pawn move resets the count

- **WHEN** the moves are 1. Nf3 Nf6 2. Ng1 Ng8 3. e3 e6 4. Nf3 Nf6 5. Ng1 Ng8
- **THEN** the round continues, and the stored history holds exactly 5 positions: those after 3... e6 through 5... Ng8

#### Scenario: Bounded by the fifty-move rule

- **WHEN** 100 quiet half-moves have been played since the last capture or pawn move
- **THEN** the stored history holds at most 101 positions

### Requirement: Timeout loses in chess

A chess player whose clock runs out SHALL lose the round, even when the opponent has too little material to checkmate.

#### Scenario: Flag against a lone king

- **WHEN** white's clock runs out while black has only its king
- **THEN** seat 1 wins the round
