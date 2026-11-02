# Spec Delta

## Purpose

Defines the card a game room shows over the board when a live round ends or the room closes: what it says about the outcome and which next steps it offers.

## ADDED Requirements

### Requirement: Result card at round end

When the live round ends and the viewer is not scrubbing history, the room SHALL show a result card over the board area without moving any other element. The card SHALL show, in order: the result, the reason when the round ended by timeout, resignation, or abandonment, the viewer's rating change, and the match score.

#### Scenario: Seated winner by resignation

- **WHEN** the viewer is seated in seat 0 and seat 1 ("Blair") resigns the live round
- **THEN** a card over the board reads "You won", "Blair resigned", and the score of both seats, and no layout-shift entry is recorded

#### Scenario: Loss on time

- **WHEN** the viewer's clock runs out
- **THEN** the card reads "You lost" and "Out of time"

#### Scenario: Draw

- **WHEN** the round ends in a draw
- **THEN** the card reads "Draw" with no reason line

#### Scenario: Spectator

- **WHEN** a spectator watches seat 1 ("Blair") win
- **THEN** the card reads "Blair won" and shows no rating line

#### Scenario: Not while scrubbing or on a past round

- **WHEN** the viewer scrubs back in a finished round, or opens a past round
- **THEN** no result card is shown

### Requirement: Rating change on the card

The rating line SHALL show the viewer's settled rating change for that round as a signed number ("+8 rating", "-8 rating"), or "Rating unchanged" for a draw. While the settled change is not yet known, the line SHALL keep its box and show nothing. Spectators SHALL see no rating line.

#### Scenario: Settled win

- **WHEN** the viewer's settled change for the round is 8
- **THEN** the rating line reads "+8 rating"

#### Scenario: Not yet settled

- **WHEN** the round has ended and no settled change is known for it
- **THEN** the rating line is empty and the card keeps its size

### Requirement: Result card actions

For a seated viewer in an open room, the card SHALL offer Rematch (primary), New opponent, and Lobby. Rematch SHALL start the next round in one click. New opponent SHALL abandon the room and then open `/play?game=<type>`. Lobby SHALL open `/lobby` without leaving the room. A spectator SHALL see only Lobby.

#### Scenario: One-click rematch

- **WHEN** a seated viewer clicks Rematch on the card
- **THEN** the rematch request is sent once and no menu or confirmation opens

#### Scenario: New opponent

- **WHEN** a seated viewer clicks New opponent in a tic-tac-toe room
- **THEN** the room is abandoned and the browser opens `/play?game=tictactoe`

#### Scenario: Spectator actions

- **WHEN** a spectator sees the card
- **THEN** the only action is Lobby

### Requirement: Hiding the result card

The card SHALL offer a "View board" control that hides it for that round. Escape SHALL also hide it. The round controls row SHALL still offer Rematch while it is hidden.

#### Scenario: View the final board

- **WHEN** the viewer presses "View board"
- **THEN** the card is hidden, the final board is visible, and the controls row shows Rematch

### Requirement: Closed room card

When the room has closed, the card SHALL say why ("Blair left the room", "You left the room", "Nobody joined, so the room closed", or "This room is closed" when the room data doesn't say) and SHALL offer Play again (primary, opening `/play?game=<type>`) and Lobby instead of Rematch and New opponent.

#### Scenario: Opponent left

- **WHEN** seat 1 ("Blair") abandons a live round and the room closes
- **THEN** the card reads "Blair left the room" and offers Play again and Lobby

#### Scenario: Never filled

- **WHEN** a waiting room closes before a second player joins
- **THEN** the card reads "Nobody joined, so the room closed" and Play again opens `/play?game=<type>`
