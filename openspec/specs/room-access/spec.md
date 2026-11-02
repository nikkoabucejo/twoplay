# room-access Specification

## Purpose

Defines what a game room page shows when its room cannot be loaded, and how it moves a viewer to the right game's page without losing the round they asked for.

## Requirements

### Requirement: Signed-out room

When the viewer is signed out, the room page SHALL show an in-page sign-in gate reading "Sign in to join this Tic-Tac-Toe game." (or "Sign in to join this Checkers game.") with a Sign in button, instead of the room, and the header SHALL hide its own Sign in button.

#### Scenario: Signed-out visitor opens a room

- **WHEN** a signed-out visitor opens `/checkers/ABCD`
- **THEN** the page shows "Sign in to join this Checkers game." and one Sign in button, in the gate, not in the header

### Requirement: Room query error

When the room query fails, the room page SHALL show "Couldn't load this room." with a Retry button that reloads the page and a "Back to play" link, instead of rendering nothing.

#### Scenario: Query fails

- **WHEN** the room query for `/checkers/ABCD` returns an error
- **THEN** the page shows "Couldn't load this room.", Retry, and "Back to play"

### Requirement: Wrong-game redirect keeps the round

When a room code opened under one game belongs to the other game, the page SHALL replace the URL with that game's room URL, keeping the round segment when one was given.

#### Scenario: Round kept

- **WHEN** the viewer opens `/tictactoe/ABCD/2` and `ABCD` is a checkers room
- **THEN** the browser replaces the URL with `/checkers/ABCD/2`

#### Scenario: No round

- **WHEN** the viewer opens `/tictactoe/ABCD` and `ABCD` is a checkers room
- **THEN** the browser replaces the URL with `/checkers/ABCD`

### Requirement: Canonical room code in the URL

When a room code is opened in a different case than the room's code (for example `/tictactoe/tsr2m5` for room `TSR2M5`), the page SHALL replace the URL with the room's canonical URL, keeping the round segment when one was given, and SHALL display the canonical code.

#### Scenario: Lowercase code

- **WHEN** the viewer opens `/tictactoe/abcd/2` and the room's code is `ABCD`
- **THEN** the browser replaces the URL with `/tictactoe/ABCD/2` and the room bar shows `ABCD`
