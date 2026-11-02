# core-pages Specification

## Purpose

Defines what Lobby, History, and Leaderboard share: empty states, and the Leaderboard sidebar with the viewer's rating and how ratings work.

## Requirements

### Requirement: Empty states without duplicate actions

When Lobby, History, or Leaderboard has no items for a signed-in viewer, it SHALL show an `Empty` state with a title and a description and no action links, since the header's Play link already starts a game. Lobby's title SHALL be "No open rooms right now".

#### Scenario: Empty lobby

- **WHEN** a signed-in viewer opens `/lobby` and `rooms.index.lobbies` returns no rooms
- **THEN** the page shows "No open rooms right now" and no "Find match" or "Open a room" link

#### Scenario: Empty history

- **WHEN** a signed-in viewer with no rounds opens `/history`
- **THEN** the page shows "No games yet" and no "Find match" or "Open a room" link

#### Scenario: Empty leaderboard

- **WHEN** `ratings.index.top` returns no players
- **THEN** the page shows "No ratings yet" and no "Find match" or "Open a room" link

### Requirement: Leaderboard sidebar

For a signed-in viewer, Leaderboard SHALL show a sidebar with the viewer's rating summary and the ratings explanation, beside the ranks at `lg` and wider and above them below `lg`. Lobby and History SHALL have no sidebar at any width: their list stays centered at the same max width as on a phone.

#### Scenario: Leaderboard at desktop width

- **WHEN** a signed-in viewer opens `/leaderboard` at 1280px
- **THEN** a sidebar beside the ranks shows their rating summary and how ratings work

#### Scenario: Leaderboard at phone width

- **WHEN** the same viewer opens `/leaderboard` at 360px
- **THEN** the rating summary and how ratings work show above the ranks

#### Scenario: Lobby and History have no sidebar

- **WHEN** a signed-in viewer opens `/lobby` or `/history` at 1280px
- **THEN** no sidebar is rendered and the list is centered

#### Scenario: Signed out

- **WHEN** a signed-out visitor opens `/leaderboard` at 1280px
- **THEN** no sidebar content is rendered

### Requirement: Sidebar loads without shifting

While the Leaderboard sidebar's queries load, it SHALL show skeletons with the same box as the loaded content, so loading the sidebar moves nothing on the page.

#### Scenario: Sidebar loading

- **WHEN** `/leaderboard` loads at 1280px and `rooms.index.stats` resolves after the ranks
- **THEN** the sidebar shows a skeleton first, then the loaded content in the same box, and the cumulative layout-shift score is at most 0.01
