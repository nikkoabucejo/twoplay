# room-play Specification

## Purpose

Defines how the server finds a room by its code and moves a room through its rounds: which code forms resolve, when moves are accepted, what a round lookup returns, and how rematch behaves under repeated calls.

## Requirements

### Requirement: Room codes are case-insensitive

The server SHALL resolve a room code regardless of letter case and surrounding whitespace, for every lookup by code. Responses SHALL carry the room's stored uppercase code.

#### Scenario: Joining with a lowercase code

- **WHEN** user B joins with the lowercase form of user A's room code
- **THEN** B takes seat 1 and the result carries the uppercase code

#### Scenario: Reading a room with a lowercase code

- **WHEN** a seated user reads `rooms.get` with the lowercase code
- **THEN** it returns the room with its uppercase code

### Requirement: No moves or resignations while a seat is empty

`rooms.play` and `games.resign` SHALL throw "Waiting for opponent" while the room has fewer players than its game needs, and SHALL write nothing.

#### Scenario: The host moves before anyone joins

- **WHEN** the only seated player of a new tic-tac-toe room plays a move
- **THEN** it throws "Waiting for opponent" and the board is unchanged

#### Scenario: The host resigns before anyone joins

- **WHEN** the only seated player of a new room resigns
- **THEN** it throws "Waiting for opponent" and no result is recorded

### Requirement: A round past the latest resolves to the live round

`rooms.get` and `games.history` SHALL resolve a requested round that doesn't exist to the room's live round, and SHALL keep their return shapes. `rooms.get` SHALL return null only when no room has that code.

#### Scenario: Requesting a round that doesn't exist yet

- **WHEN** a room is on round 1 and a user reads `rooms.get` for round 5
- **THEN** it returns the room with round 1, latest round 1, and live set to true

#### Scenario: Move history for a round that doesn't exist yet

- **WHEN** a room is on round 1 with two moves and a user reads `games.history` for round 5
- **THEN** it returns round 1's two moves

### Requirement: Rematch is idempotent per round

`rooms.rematch` SHALL accept an optional expected round. When it is given and the room's live round is a different round, rematch SHALL return without writing.

#### Scenario: Both seats press Rematch for the same round

- **WHEN** round 1 is over and both seats call rematch with round 1, one after the other
- **THEN** the room has exactly 2 rounds and neither call throws

#### Scenario: Rematch without a round keeps the old rule

- **WHEN** round 2 is in progress and a seat calls rematch without a round
- **THEN** it throws "This round isn't over yet"
