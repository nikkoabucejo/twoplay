# round-result Specification

## Purpose

Defines the card a game room shows over the board when a live round ends or the room closes: what it says about the outcome and which next steps it offers.

## Requirements

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

The card SHALL show the viewer's settled rating change for that round in a pill as a signed number ("+8", "−8") or "±0" for a draw or no change, announced as "+8 rating", "-8 rating", or "Rating unchanged". While the settled change is not yet known, the pill SHALL keep its box and show nothing. Spectators SHALL see no rating pill.

#### Scenario: Settled win

- **WHEN** the viewer's settled change for the round is 8
- **THEN** the rating pill shows "+8" and is announced as "+8 rating"

#### Scenario: Settled loss

- **WHEN** the viewer's settled change for the round is -8
- **THEN** the rating pill shows "−8" and is announced as "-8 rating"

#### Scenario: Not yet settled

- **WHEN** the round has ended and no settled change is known for it
- **THEN** the rating pill is empty and the card keeps its size

### Requirement: Result card actions

For a seated viewer in an open room, the card SHALL offer Rematch (primary) and New opponent, and Lobby below the `sm` breakpoint only. Rematch SHALL start the next round in one click. New opponent SHALL abandon the room and then open `/play?game=<type>`. Lobby SHALL open `/lobby` without leaving the room. A spectator SHALL see only Lobby, below `sm`. While the card is shown, the round controls' action slot SHALL be hidden and keep its box, so Rematch shows only on the card.

#### Scenario: One-click rematch

- **WHEN** a seated viewer clicks Rematch on the card
- **THEN** the rematch request is sent once and no menu or confirmation opens

#### Scenario: Rematch only on the card

- **WHEN** a round ends and the card is shown
- **THEN** the controls row's action slot is invisible and keeps its box, and Rematch is offered only on the card

#### Scenario: New opponent

- **WHEN** a seated viewer clicks New opponent in a tic-tac-toe room
- **THEN** the room is abandoned and the browser opens `/play?game=tictactoe`

#### Scenario: Lobby only on phones

- **WHEN** the card renders at 360x640 and at 1280x800
- **THEN** Lobby is offered at 360x640 and hidden at 1280x800

#### Scenario: Spectator actions

- **WHEN** a spectator sees the card below `sm`
- **THEN** the only action is Lobby

### Requirement: Hiding the result card

The card SHALL offer a "View board" control that hides it for that round. Escape SHALL also hide it. Once it is hidden, the round controls' action slot SHALL show again and offer Rematch.

#### Scenario: View the final board

- **WHEN** the viewer presses "View board"
- **THEN** the card is hidden, the final board is visible, and the controls row shows Rematch

### Requirement: Closed room card

When the room has closed, the card SHALL say why ("Blair left the room", "You left the room", "Nobody joined, so the room closed", or "This room is closed" when the room data doesn't say) and SHALL offer Play again (primary, opening `/play?game=<type>`), and Lobby below `sm`, instead of Rematch and New opponent.

#### Scenario: Opponent left

- **WHEN** seat 1 ("Blair") abandons a live round and the room closes
- **THEN** the card reads "Blair left the room" and offers Play again, and Lobby below `sm`

#### Scenario: Never filled

- **WHEN** a waiting room closes before a second player joins
- **THEN** the card reads "Nobody joined, so the room closed" and Play again opens `/play?game=<type>`
