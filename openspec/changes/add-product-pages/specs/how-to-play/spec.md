# Spec Delta

## Purpose

Explains each game's rules on its own page, so a new player can learn a game before or during a match.

## ADDED Requirements

### Requirement: Rules index

`/how-to-play` SHALL list every game in the games registry, each linking to `/how-to-play/<game>`.

#### Scenario: Index lists both games

- **WHEN** a visitor opens `/how-to-play`
- **THEN** it links to `/how-to-play/tictactoe` and `/how-to-play/checkers`

### Requirement: Rules page per game

`/how-to-play/<game>` SHALL show that game's name, its rules as short sections with a small diagram where a rule is spatial, and a Play button linking to `/play`. The rules SHALL match what the server engine enforces.

#### Scenario: Tic-tac-toe rules

- **WHEN** a visitor opens `/how-to-play/tictactoe`
- **THEN** the page explains the nine boards, that a player can't play the board they played last turn unless it is the only open board, that three won boards in a line win, and that a player whose clock runs out loses

#### Scenario: Checkers rules

- **WHEN** a visitor opens `/how-to-play/checkers`
- **THEN** the page explains diagonal moves, forced captures, multi-jump continuation, crowning on the far row, that a player with no legal move loses, and that a player whose clock runs out loses

### Requirement: Unknown game

`/how-to-play/<game>` for a game not in the registry SHALL respond 404 with the error page.

#### Scenario: Unknown game slug

- **WHEN** a visitor opens `/how-to-play/chess`
- **THEN** the response status is 404

### Requirement: Rules metadata

Each rules page SHALL render the title `How to play <Game> · twoplay` and a game-specific description. The index SHALL render `How to play · twoplay`.

#### Scenario: Checkers rules title

- **WHEN** `/how-to-play/checkers` renders
- **THEN** the document title is `How to play Checkers · twoplay`
