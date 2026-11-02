# player-stats Specification

## Purpose

Shows a signed-in player their own rating, rank, record per game, and recent rounds on one page.

## Requirements

### Requirement: Own stats only

`/me` SHALL show only the signed-in viewer's own data, read from existing authenticated queries. A signed-out visitor SHALL see an in-page sign-in gate and no stats, and the header SHALL NOT show its own Sign in button on `/me`.

#### Scenario: Signed out

- **WHEN** a signed-out visitor opens `/me`
- **THEN** the page shows "Sign in to see your stats." with a Sign in button and no rating or record, and the header shows no Sign in button

### Requirement: Rating and rank

`/me` SHALL show the viewer's rating and their rank on the leaderboard, or "Unranked" when they are not in the leaderboard list.

#### Scenario: Ranked player

- **WHEN** the viewer is third on the leaderboard with rating 1240
- **THEN** the page shows 1240 and rank #3

#### Scenario: Unranked player

- **WHEN** the viewer is not in the leaderboard list
- **THEN** the page shows their rating and "Unranked"

### Requirement: Record per game

`/me` SHALL show total games and win rate, and for each game in the registry the count of wins, losses, and draws over finished rounds. Rounds still in play SHALL NOT count.

#### Scenario: Record splits by game

- **WHEN** the viewer's history has two tic-tac-toe wins, one checkers loss, one checkers draw, and one round in play
- **THEN** tic-tac-toe shows 2 wins, 0 losses, 0 draws and checkers shows 0 wins, 1 loss, 1 draw

### Requirement: Recent rounds

`/me` SHALL list the viewer's ten most recent rounds, newest first, each with the game, opponent, result, and a link to that round. With no rounds, it SHALL show an empty state.

#### Scenario: Newest first, capped

- **WHEN** the viewer has 12 rounds
- **THEN** 10 are listed, newest first, each linking to `/<game>/<code>/<round>`

### Requirement: No account controls on the stats page

`/me` SHALL NOT show an Account button; the avatar menu's Account item opens the account profile.

#### Scenario: Account left to the avatar menu

- **WHEN** a signed-in viewer opens `/me`
- **THEN** the page has no Account button

### Requirement: Stats metadata

`/me` SHALL render the title `My stats · twoplay` and a description.

#### Scenario: Stats title

- **WHEN** `/me` renders
- **THEN** the document title is `My stats · twoplay`
