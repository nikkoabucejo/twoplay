## MODIFIED Requirements

### Requirement: Game cards

The landing page SHALL show one card per game to every viewer, signed in or out. Each card SHALL show the game's name, its one-line description, and a decorative board preview hidden from assistive technology, and SHALL link to `/play?game=<type>`.

#### Scenario: Cards link with the game preselected

- **WHEN** `/` renders for a signed-out visitor and for a signed-in user
- **THEN** both show a Tic-Tac-Toe card linking to `/play?game=tictactoe`, a Checkers card linking to `/play?game=checkers`, and a Chess card linking to `/play?game=chess`, each with its description

#### Scenario: Picking a game once

- **WHEN** a signed-in user clicks the Checkers card on `/`
- **THEN** `/play` opens with Checkers selected
