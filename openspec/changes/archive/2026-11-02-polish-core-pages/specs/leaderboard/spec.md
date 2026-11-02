## Purpose

Defines how `/leaderboard` presents the top-rated players, the viewer's own standing, and how ratings work.

## ADDED Requirements

### Requirement: Podium for the top three

The leaderboard SHALL show the top three players as a podium above the remaining ranks, each with rank, name, and rating. With fewer than three ranked players, the podium SHALL show only the players that exist.

#### Scenario: Five ranked players

- **WHEN** `ratings.index.top` returns five players
- **THEN** ranks 1–3 show in the podium and ranks 4–5 show in the list below it

#### Scenario: One ranked player

- **WHEN** `ratings.index.top` returns one player
- **THEN** the podium shows that player as rank 1 and the list below is empty

### Requirement: Ranks as a table on desktop

Ranks after the podium SHALL render as a table with column headers for rank, player, games, win rate, and rating. At `lg` and wider each value SHALL have its own column, with Games and Win rate right-aligned. Below `lg`, the games and win rate columns SHALL be hidden, and the same values SHALL show as one line under the player's name.

#### Scenario: Desktop table

- **WHEN** the leaderboard with five players is viewed at 1280px
- **THEN** a table with column headers Rank, Player, Games, Win rate, and Rating holds ranks 4–5, with Games and Win rate right-aligned

#### Scenario: Phone width

- **WHEN** the same leaderboard is viewed at 360px
- **THEN** the Games and Win rate columns are hidden, each row shows "N games · N% win" under the name, and no text wraps or overflows horizontally

### Requirement: Row stats placeholder

Until per-player stats load, a row SHALL show "—" for games and win rate instead of zeros.

#### Scenario: Stats still loading

- **WHEN** `ratings.index.top` has loaded and `rooms.index.statsForUsers` has not
- **THEN** each row shows "—" for games and win rate, and no row shows "0 games"

### Requirement: Own row pinned when off-screen

When the viewer is ranked below the podium but their row is out of view, a copy of their row SHALL be pinned to the bottom edge of the scrolling area: the list at `lg` and wider, and `main` below `lg`, where the page scrolls inside `main` instead of the list. The pinned slot SHALL keep its space when hidden, so showing it moves nothing.

#### Scenario: Own row scrolled out of view

- **WHEN** the viewer is rank 40 and their row is scrolled out of view
- **THEN** a row with rank 40, their name, and their rating is pinned at the bottom of the scrolling area

#### Scenario: Phone width scrolls the page

- **WHEN** a signed-in viewer ranked below the podium opens `/leaderboard` at 360px and scrolls
- **THEN** `main` scrolls the sidebar and the ranks together, and the pinned row sticks to `main`'s bottom

#### Scenario: Own row visible

- **WHEN** the viewer's row is in view
- **THEN** no pinned row is shown

### Requirement: Unranked copy

When the viewer is not on the leaderboard and has finished no games, their rating summary SHALL say "Finish a game to get ranked". When they have finished games but are not in the list, it SHALL say "Not in the top N", where N is the list's length.

#### Scenario: New player

- **WHEN** the viewer is not in `ratings.index.top` and `rooms.index.stats` reports 0 total games
- **THEN** the rating summary reads "Finish a game to get ranked"

### Requirement: Ratings explained

The leaderboard SHALL explain how ratings work: everyone starts at 400, a win adds 8, a loss subtracts 8, a rating never drops below 100, a draw changes nothing, and one rating covers every game.

#### Scenario: Explanation shown

- **WHEN** a signed-in viewer opens `/leaderboard`
- **THEN** the page states the start rating 400, the ±8 step, the 100 floor, that draws change nothing, and that one rating covers every game
