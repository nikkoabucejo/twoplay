# Spec Delta

## Purpose

Shows a signed-in player their own rating, rank, record per game, and recent rounds on one page.

## ADDED Requirements

### Requirement: Own stats only

`/me` SHALL show only the signed-in viewer's own data, read from existing authenticated queries. A signed-out visitor SHALL see a sign-in prompt and no stats.

#### Scenario: Signed out

- **WHEN** a signed-out visitor opens `/me`
- **THEN** the page shows a Sign in button and no rating or record

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

### Requirement: Account button

`/me` SHALL have an Account button that opens the Clerk account profile.

#### Scenario: Account opens the profile

- **WHEN** the viewer activates Account
- **THEN** the account profile opens

### Requirement: Stats metadata

`/me` SHALL render the title `My stats · twoplay` and a description.

#### Scenario: Stats title

- **WHEN** `/me` renders
- **THEN** the document title is `My stats · twoplay`
