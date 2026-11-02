## MODIFIED Requirements

### Requirement: Tic-tac-toe rules popover

In a tic-tac-toe room, a "?" button named "Rules" SHALL open a popover that says a player wins a board with three in a row, wins the game with three boards in a row, and may not play the board they played on their last turn unless it is the only open board. It SHALL link to `/learn/tictactoe` with the text "Learn the rules".

#### Scenario: Open the rules

- **WHEN** the viewer clicks "Rules" in a tic-tac-toe room
- **THEN** a popover shows the three rules and a "Learn the rules" link to `/learn/tictactoe`

#### Scenario: Not in checkers

- **WHEN** a checkers room renders
- **THEN** there is no "Rules" button
