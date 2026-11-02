## Purpose

Defines how `/history` lists the signed-in viewer's past rounds: one row per round, grouped by day, with the result, rating change, and a Replay link.

## ADDED Requirements

### Requirement: One row per round, grouped by day

History SHALL list one row per round across all of the viewer's rooms, newest first. Rows SHALL be grouped under a heading for the local calendar day the round started: "Today", "Yesterday", or a short date such as "Oct 28". A date from a different year SHALL include the year.

#### Scenario: Rounds from two days

- **WHEN** the viewer has a round from today and two rounds from yesterday in different rooms
- **THEN** History shows a "Today" group with one row, then a "Yesterday" group with two rows, newest first

#### Scenario: Older round

- **WHEN** a round started on a day before yesterday in the current year
- **THEN** its group heading is the short month and day, with no year

### Requirement: Round row content

Each row SHALL show the game, the opponent's name or "Waiting for an opponent", the round number, a result badge, the end reason, the rating change, and Replay. The badge SHALL show W, L, or D, with "Win", "Loss", or "Draw" as its accessible text. A round still in progress SHALL show "Playing", which pulses only when motion is allowed.

#### Scenario: Win against a named opponent

- **WHEN** a row is for round 2 of a Tic-Tac-Toe room against Bob Baker that the viewer won for +8
- **THEN** the row shows "Tic-Tac-Toe", "Bob Baker", "Round 2", a W badge with accessible text "Win", and "+8"

#### Scenario: No opponent

- **WHEN** a room's second seat never filled
- **THEN** its rows show "Waiting for an opponent" in place of the opponent's name

### Requirement: Fixed row columns

The badge, reason, rating change, and Replay SHALL sit in fixed-width columns, so each column starts at the same x in every row. Below an `@sm` container width, Replay SHALL show only its icon.

#### Scenario: Columns line up

- **WHEN** History shows rows with different reasons and rating changes at 360px or 1280px
- **THEN** each column starts at the same x in every row

#### Scenario: Narrow container

- **WHEN** the row list is narrower than `@sm`
- **THEN** every Replay link shows only its icon and keeps its accessible name

### Requirement: End reason when known

When a history entry carries an end reason, its row SHALL show it after the badge: "Timeout", "Resigned", or "Abandoned". When the reason is absent or null, the row SHALL show no reason and SHALL otherwise render the same.

#### Scenario: Round lost on time

- **WHEN** a lost round's entry has reason "timeout"
- **THEN** the row shows "Timeout" next to the L badge

#### Scenario: Entry without a reason field

- **WHEN** a finished round's entry has no `reason` field
- **THEN** the row shows its badge and rating change with no reason text, and nothing reads "undefined" or "null"

### Requirement: Rating change display

A positive change SHALL show with a plus sign, a negative change with a minus sign (U+2212), and a zero change as "0" with no sign. A round with no rating change SHALL show "—" in the same fixed-width column, so a change arriving later does not move the row.

#### Scenario: Loss at the rating floor

- **WHEN** a lost round settled a rating change of 0
- **THEN** the row shows "0", not "-0" or "−0"

#### Scenario: Loss

- **WHEN** a lost round settled a change of −8
- **THEN** the row shows "−8"

#### Scenario: No rating change

- **WHEN** a round has no rating change
- **THEN** the row shows "—" in the rating column

### Requirement: Replay link

Each finished round SHALL have a "Replay" link to `/<type>/<code>/<round>`. Its accessible name SHALL be unique on the page and name the game, the round, the opponent, and the room, for example "Replay Tic-Tac-Toe round 2 vs Bob Baker, room WXYZ".

#### Scenario: Two rounds of one room

- **WHEN** History shows rounds 1 and 2 of the same room
- **THEN** the two Replay links have different accessible names and link to `/tictactoe/WXYZ/1` and `/tictactoe/WXYZ/2`

### Requirement: Live room stays out of the list

The viewer's active room SHALL appear only as the Playing card below the list. A room that finishes while the page is open SHALL stay in the slot below the list until the next visit, so no rows are inserted above rows already shown.

#### Scenario: Room finishes while the page is open

- **WHEN** the active room's round ends and `rooms.index.active` becomes null while History is open
- **THEN** that room's rows show in the slot below the list, and the rows above keep their positions
