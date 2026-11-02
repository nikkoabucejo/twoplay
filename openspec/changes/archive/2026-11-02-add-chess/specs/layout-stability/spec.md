## MODIFIED Requirements

### Requirement: Stable page load

Loading `/`, `/play`, `/lobby`, `/history`, `/leaderboard`, and a game room (`/tictactoe/<code>`, `/checkers/<code>`, `/chess/<code>`) SHALL produce a cumulative layout-shift score of at most 0.01, at 360x640 and at 1280x800, both signed in and signed out.

#### Scenario: Signed-in load at both viewports

- **WHEN** a signed-in user loads each listed route with a cold cache at 360x640 and at 1280x800
- **THEN** the cumulative layout-shift score for each load is at most 0.01

#### Scenario: Signed-out load at both viewports

- **WHEN** a signed-out visitor loads each listed route at 360x640 and at 1280x800
- **THEN** the cumulative layout-shift score for each load is at most 0.01

### Requirement: Stable turn changes

When the turn passes between players, or a round ends, in a tic-tac-toe, checkers, or chess room, the app SHALL record no layout-shift entries. The same SHALL hold when the chess promotion picker opens or closes, and when the viewer's pending move is shown, confirmed, or rolled back with its shake and toast. The player strips, names, scores, clocks, status lines, board, and round controls SHALL keep their positions and sizes. Numbers SHALL use tabular figures in fixed-width boxes, and animations SHALL change only `transform` or `opacity`.

#### Scenario: Three turn changes in tic-tac-toe

- **WHEN** two players in `browser-a` and `browser-b`, seated in one tic-tac-toe room, alternate at least three moves while both observers run
- **THEN** neither browser records a layout-shift entry

#### Scenario: Three turn changes in checkers

- **WHEN** two players in `browser-a` and `browser-b`, seated in one checkers room, alternate at least three moves while both observers run
- **THEN** neither browser records a layout-shift entry

#### Scenario: Round end without shift

- **WHEN** two seated players in `browser-a` and `browser-b` finish a round (a win, then a draw or a resignation) while both observers run, at 360x640 and 1280x800
- **THEN** neither browser records a layout-shift entry

#### Scenario: Room error does not push the board

- **WHEN** a room action fails and its error message appears in the notice line
- **THEN** the board and footer controls do not move

#### Scenario: Pending moves on a throttled network

- **WHEN** `browser-a` is throttled to at least 1 second of added latency and the two players alternate at least three moves while both observers run
- **THEN** neither browser records a layout-shift entry

#### Scenario: Rollback without shift

- **WHEN** `browser-a`'s pending move is rejected, the board shakes, and the toast appears while its observer runs
- **THEN** `browser-a` records no layout-shift entry

#### Scenario: Three turn changes in chess

- **WHEN** two players in `browser-a` and `browser-b`, seated in one chess room, alternate at least three moves while both observers run
- **THEN** neither browser records a layout-shift entry

#### Scenario: Promotion picker without shift

- **WHEN** a seated player opens the promotion picker, cancels it, then opens it again and promotes, while the observer runs
- **THEN** the browser records no layout-shift entry
