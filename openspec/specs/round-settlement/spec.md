# round-settlement Specification

## Purpose

Defines when a round counts as over and how the server settles it: room score and rating are credited exactly once at the moment the round ends, and a round with no real opponent counts for nobody.

## Requirements

### Requirement: A round settles when it ends

The server SHALL settle a round in the same mutation that ends it: a move that wins or draws the board, a resignation, a clock timeout, an abandon, or the idle sweep. Settling a decisive round SHALL add 1 to the winner's room score and apply the rating change to both players, and the change SHALL be readable at once without a rematch.

#### Scenario: A winning move credits the winner at once

- **WHEN** seat 0 makes the move that wins a tic-tac-toe round
- **THEN** seat 0's score is 1, seat 0's rating is 408, seat 1's rating is 392, and both players' results for that round hold their MMR change, before anyone calls rematch

#### Scenario: A resignation credits the opponent at once

- **WHEN** seat 1 resigns a round in progress
- **THEN** seat 0's score is 1 and seat 0's rating is 408

#### Scenario: A timeout credits the opponent at once

- **WHEN** the active seat's clock has run out and any signed-in caller claims the timeout
- **THEN** the other seat's score is 1 and its rating is 408

#### Scenario: Abandoning a full room credits the opponent

- **WHEN** seat 0 abandons a two-seat room mid-round
- **THEN** seat 1's score is 1, seat 1's rating is 408, seat 0's rating is 392, and the room is closed

#### Scenario: A draw credits nobody

- **WHEN** a move fills the tic-tac-toe board with no winner
- **THEN** neither score changes, neither rating changes, and neither result has an MMR value

### Requirement: A round settles at most once

The server SHALL credit a round's score and rating at most once, no matter how many later mutations touch the round (rematch, abandon, sweep, or a repeated resign or timeout).

#### Scenario: Rematch after a settled win credits nothing more

- **WHEN** seat 0 wins a round and then either seat calls rematch
- **THEN** seat 0's score stays 1, seat 0's rating stays 408, and round 2 starts

#### Scenario: Abandon after a settled win credits nothing more

- **WHEN** seat 0 wins a round and then seat 1 abandons the room before a rematch
- **THEN** seat 0's score stays 1, seat 0's rating stays 408, and seat 1's rating stays 392

### Requirement: Clocks stop when a round settles

The server SHALL stop every clock of a round when the round settles, keeping each seat's remaining time as of that moment.

#### Scenario: The idle sweep stops the clocks

- **WHEN** both seats of a full room stop heartbeating past the idle limit and the sweep runs
- **THEN** no clock of the current round is running

### Requirement: An unsettled ended round settles on rematch

When rematch finds the current round over but not yet settled, the server SHALL settle it before starting the next round.

#### Scenario: A round that ended before settlement existed

- **WHEN** the current round's board is won but the round carries no settlement, and a seat calls rematch
- **THEN** the winner's score and rating are credited once and round 2 starts

### Requirement: Rounds without a real opponent are no-contest

A round that ends while a seat is empty, or because every seat went idle, SHALL be no-contest. A no-contest round SHALL change no score and no rating, and SHALL stop counting as "playing".

#### Scenario: The host abandons before anyone joins

- **WHEN** the only seated player abandons a room nobody joined
- **THEN** their score and rating are unchanged, the room is closed, and the round is no-contest

#### Scenario: A waiting room expires

- **WHEN** the sweep closes a room whose second seat never filled
- **THEN** the round is no-contest and the host's rating is unchanged

#### Scenario: Every seat goes idle

- **WHEN** the sweep closes a full room because both seats stopped heartbeating
- **THEN** the round is no-contest, neither score nor rating changes, and the room is closed with reason "inactive"

### Requirement: No-contest rounds are left out of history and stats

`rooms.history` SHALL omit no-contest rounds from a room's rounds, and SHALL omit a room left with no rounds. `rooms.stats` and `rooms.statsForUsers` SHALL not count no-contest rounds. A round in a room that never filled its second seat SHALL count as no-contest even if it was ended before this rule existed.

#### Scenario: An abandoned waiting room is not a loss

- **WHEN** a user abandons a room nobody joined and then reads their history and stats
- **THEN** history has no entry for that room and stats show 0 games

#### Scenario: An idle-closed round is not shown as playing

- **WHEN** a full room is closed by the idle sweep and a seated user reads their history
- **THEN** that round is not listed as "playing"

### Requirement: History rounds carry their end reason

Each round in `rooms.history` SHALL carry an optional `reason`: "timeout", "resign", or "abandon" when a seat's round ended for that cause, and null when the round ended on the board or is still playing. All other fields of the round SHALL be unchanged.

#### Scenario: A resigned round

- **WHEN** seat 1 resigns round 1 and seat 0 reads their history
- **THEN** round 1 has result "win" and reason "resign"

#### Scenario: A round won on the board

- **WHEN** seat 0 wins round 1 by a move and reads their history
- **THEN** round 1 has result "win" and reason null

#### Scenario: A timed-out round

- **WHEN** seat 0's clock runs out, the timeout is claimed, and seat 1 reads their history
- **THEN** round 1 has result "win" and reason "timeout"
