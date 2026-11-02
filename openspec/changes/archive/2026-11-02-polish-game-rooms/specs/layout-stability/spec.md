# Spec Delta

## MODIFIED Requirements

### Requirement: Placeholders match their content's box

Wherever this change shows a loading placeholder (a Skeleton or a Spinner state) in place of content, the placeholder SHALL occupy the same box as the content that replaces it, so swapping one for the other does not move surrounding elements. Content shown conditionally on a query (such as the active-room card) SHALL appear in the same swap as the rest of the page's content, not after it.

#### Scenario: Lobby list replaces its skeleton in place

- **WHEN** a signed-in user loads `/lobby` and the open-rooms query resolves
- **THEN** the page header and footer record no layout-shift entry

#### Scenario: Game room replaces its placeholder in place

- **WHEN** a seated player loads `/checkers/ABCD` and the room query resolves
- **THEN** the room bar, both player strips, the board, and the round controls appear in the box the placeholder occupied, and no layout-shift entry is recorded

#### Scenario: Room placeholder mirrors the strips

- **WHEN** the room placeholder renders below the `lg` breakpoint
- **THEN** it has a room-bar slot, then a strip-height slot above and below a square area at the board's size, followed by the round controls row and the notice line, with no emoji columns beside the board

#### Scenario: Room placeholder mirrors the side panel

- **WHEN** the room placeholder renders at 1280x800
- **THEN** it reserves the side panel's box beside the board column, no room-bar slot, and no controls slot, and loading the room records no layout-shift entry

### Requirement: Stable turn changes

When the turn passes between players, or a round ends, in a tic-tac-toe or checkers room, the app SHALL record no layout-shift entries. The same SHALL hold when the viewer's pending move is shown, confirmed, or rolled back with its shake and toast. The player strips, names, scores, clocks, status lines, board, and round controls SHALL keep their positions and sizes. Numbers SHALL use tabular figures in fixed-width boxes, and animations SHALL change only `transform` or `opacity`.

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

### Requirement: Player strips keep their boxes

Player strips SHALL have a fixed height and never wrap. Each strip's status line SHALL render every status variant stacked in one cell, with only visibility changing between them. Strips and the board SHALL keep one neutral border; no border or ring SHALL change with the turn.

#### Scenario: Status line keeps its box

- **WHEN** the status changes from seat 0's turn to seat 1's turn, and then to a win for seat 1
- **THEN** each strip's status line renders the same elements, exactly one variant is visible, and only visibility differs

#### Scenario: Turn ring changes no box

- **WHEN** the turn passes from seat 0 to seat 1
- **THEN** the two strips keep the same size and padding, and the strips and the board show no turn ring and the same computed border and box-shadow before and after

## ADDED Requirements

### Requirement: Room overlays do not shift layout

The result card, the invite card, and the rules popover SHALL overlay the board area or float above the page, and SHALL appear and disappear with `transform` or `opacity` only, held still when reduced motion is requested.

#### Scenario: Round ends with the card

- **WHEN** two seated players finish a round at 360x640 and at 1280x800 while the layout-shift observer runs
- **THEN** the result card appears and no layout-shift entry is recorded

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is emulated and a round ends
- **THEN** the result card appears without a running animation
