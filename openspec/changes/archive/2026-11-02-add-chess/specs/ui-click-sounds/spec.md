## MODIFIED Requirements

### Requirement: Silent controls

The app SHALL NOT tick for a control that is disabled, `aria-disabled="true"`, inert, inside a region marked `data-sfx="off"`, or activated by script rather than the user. Game boards SHALL be marked `data-sfx="off"`, so a board cell plays only its move sound.

#### Scenario: Disabled control

- **WHEN** the user clicks a disabled or `aria-disabled="true"` button
- **THEN** no tick plays

#### Scenario: Board cell

- **WHEN** the user clicks a cell on a tic-tac-toe, checkers, chess, or Learn practice board
- **THEN** no click tick plays

#### Scenario: Scripted click

- **WHEN** code calls `click()` on a button
- **THEN** no tick plays
