## MODIFIED Requirements

### Requirement: Clocks stop when a round settles

The server SHALL stop every clock of a round when the round settles, keeping each seat's remaining time as of that moment.

#### Scenario: The idle sweep stops the clocks

- **WHEN** both seats of a full room stop heartbeating past the idle limit and the sweep runs
- **THEN** no clock of the current round is running

#### Scenario: Resign on your own turn

- **WHEN** seat 0 has a 60s clock, 3s pass on its turn, and seat 0 resigns
- **THEN** seat 0's clock keeps 57s and no clock of the round is running

#### Scenario: Abandon on your own turn

- **WHEN** seat 0 has a 60s clock, 3s pass on its turn, and seat 0 abandons the room
- **THEN** seat 0's clock keeps 57s and no clock of the round is running

#### Scenario: Resign off-turn

- **WHEN** seat 0 has a 60s clock, 3s pass on its turn, and seat 1 resigns
- **THEN** seat 0's clock keeps 57s, seat 1's clock keeps 60s, and no clock of the round is running
