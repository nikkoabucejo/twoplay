# learn Specification

## Purpose

Explains each game's rules on its own Learn page, so a new player can learn a game before or during a match.

## Requirements

### Requirement: Rules index

`/learn` SHALL show a card for every game in the games registry, each with a looping demo of that game and linking to `/learn/<game>`.

#### Scenario: Index lists both games

- **WHEN** a visitor opens `/learn`
- **THEN** it links to `/learn/tictactoe` and `/learn/checkers`

### Requirement: Rules lesson per game

`/learn/<game>` SHALL show that game's name, a Play button linking to `/play?game=<game>`, and a lesson: one step per rule, each with a board demo whose positions are produced by the server engine, ending with a practice board whose moves the engine checks. Demo boards SHALL NOT use turn-colored borders. Next, Back, and the arrow keys SHALL move between steps, except while the practice board has focus. The rules SHALL match what the server engine enforces.

#### Scenario: Tic-tac-toe rules

- **WHEN** a visitor opens `/learn/tictactoe`
- **THEN** the steps explain the nine boards, that a player can't play the board they played last turn unless it is the only open board, that three won boards in a line win, and that a player whose clock runs out loses, followed by a practice step

#### Scenario: Checkers rules

- **WHEN** a visitor opens `/learn/checkers`
- **THEN** the steps explain diagonal moves, forced captures, multi-jump continuation, crowning on the far row, that a player with no legal move loses, and that a player whose clock runs out loses, followed by a practice step

#### Scenario: Stepping through the lesson

- **WHEN** a visitor presses Next, then Back
- **THEN** the current step moves forward one, then back one, and only the current step is marked selected

#### Scenario: Practice moves are engine-checked

- **WHEN** a visitor makes an illegal move on the practice board
- **THEN** the move is refused with a notice, and arrow keys pressed on the board do not change the step

### Requirement: Unknown game

`/learn/<game>` for a game not in the registry SHALL respond 404 with the error page.

#### Scenario: Unknown game slug

- **WHEN** a visitor opens `/learn/chess`
- **THEN** the response status is 404

### Requirement: Rules metadata

Each Learn page SHALL render the heading and title `Learn <Game>` (`Learn <Game> · twoplay`) and a game-specific description. The index SHALL render the heading `Learn` and the title `Learn · twoplay`.

#### Scenario: Checkers rules title

- **WHEN** `/learn/checkers` renders
- **THEN** the heading is `Learn Checkers` and the document title is `Learn Checkers · twoplay`

#### Scenario: Index title

- **WHEN** `/learn` renders
- **THEN** the heading is `Learn` and the document title is `Learn · twoplay`

### Requirement: Old rules paths redirect

The server SHALL answer `/how-to-play` and every path under it with a permanent 308 redirect to the same path under `/learn`, keeping the query string.

#### Scenario: Old index redirects

- **WHEN** a visitor requests `/how-to-play`
- **THEN** the response is 308 with `Location: /learn`

#### Scenario: Old game page redirects

- **WHEN** a visitor requests `/how-to-play/checkers?x=1`
- **THEN** the response is 308 with `Location: /learn/checkers?x=1`
