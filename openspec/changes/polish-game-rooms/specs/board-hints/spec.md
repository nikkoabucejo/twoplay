# Spec Delta

## Purpose

Defines the on-board hint that shows which mini-board the player to move may not play in ultimate tic-tac-toe, and the in-room rules summary that explains why a board is off limits.

## ADDED Requirements

### Requirement: Forbidden mini-board dimmed

During a live round, the mini-board the player to move played on their previous turn SHALL be dimmed for every viewer, unless it is the only board still in play. No mini-board SHALL change its border or ring with the turn; every mini-board keeps its neutral border. Dimming SHALL use opacity only, so no box changes.

#### Scenario: Last board dimmed

- **WHEN** it is seat 1's turn, seat 1 last played board 5, and boards 1–9 are all in play
- **THEN** board 5 is dimmed, boards 1–4 and 6–9 are not, and no board shows a seat-colored border or ring

#### Scenario: Only open board

- **WHEN** the board the mover played last is the only board still in play
- **THEN** that board is not dimmed

#### Scenario: Turn passes

- **WHEN** the turn passes from seat 0 to seat 1
- **THEN** no mini-board's border changes color

### Requirement: Tic-tac-toe rules popover

In a tic-tac-toe room, a "?" button named "Rules" SHALL open a popover that says a player wins a board with three in a row, wins the game with three boards in a row, and may not play the board they played on their last turn unless it is the only open board. It SHALL link to `/how-to-play/tictactoe`.

#### Scenario: Open the rules

- **WHEN** the viewer clicks "Rules" in a tic-tac-toe room
- **THEN** a popover shows the three rules and a link to `/how-to-play/tictactoe`

#### Scenario: Not in checkers

- **WHEN** a checkers room renders
- **THEN** there is no "Rules" button
