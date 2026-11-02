# layout-stability Specification

## Purpose

Defines when the app's layout may move on its own. After the first paint, content that the user did not ask to move SHALL stay where it is: through auth resolution, font loading, data loading, banners, toasts, and turn changes in game rooms.

Measurement used by every scenario below: a `PerformanceObserver` for `layout-shift` entries with `buffered: true`, counting only entries with `hadRecentInput === false`, summed into a cumulative score. "No shift" means zero such entries; "page load" means the cumulative score from navigation until the page has been idle for 5 seconds.

## Requirements

### Requirement: Stable page load

Loading `/`, `/play`, `/lobby`, `/history`, `/leaderboard`, and a game room (`/tictactoe/<code>`, `/checkers/<code>`, `/chess/<code>`) SHALL produce a cumulative layout-shift score of at most 0.01, at 360x640 and at 1280x800, both signed in and signed out.

#### Scenario: Signed-in load at both viewports

- **WHEN** a signed-in user loads each listed route with a cold cache at 360x640 and at 1280x800
- **THEN** the cumulative layout-shift score for each load is at most 0.01

#### Scenario: Signed-out load at both viewports

- **WHEN** a signed-out visitor loads each listed route at 360x640 and at 1280x800
- **THEN** the cumulative layout-shift score for each load is at most 0.01

### Requirement: Stable header

Auth-dependent header content (Sign in or the avatar) and the live-game pill appearing or disappearing SHALL NOT move any header element. The auth control SHALL sit in one fixed-width slot, pinned to the header's trailing edge, that holds either the avatar trigger or the Sign in button and has the same box in every auth state. The right group SHALL span the free space up to that slot, so the pill appears inside it without moving the group.

#### Scenario: Live-game pill appears

- **WHEN** a signed-in user on `/history` starts a room in another tab and the live-game pill appears in the header
- **THEN** no layout-shift entry is recorded for any header element

#### Scenario: Avatar swaps for Sign in

- **WHEN** a signed-in user loads `/play` at 360x640 and at 1280x800 with the auth UI bundle blocked, and Sign in replaces the avatar
- **THEN** the header records no layout-shift entry, and the auth slot has the same box before and after

#### Scenario: Auth client finishes loading

- **WHEN** a server-rendered page finishes loading the auth client and the auth state matches the server-rendered state
- **THEN** the header records no layout-shift entry

### Requirement: Auth error banner does not push content

The auth error banner SHALL overlay the top of the main region below the header instead of being inserted into the document flow, so page content does not move when it appears.

#### Scenario: Banner appears without moving the page

- **WHEN** the auth UI bundle is blocked and the auth error banner appears on `/play`
- **THEN** no layout-shift entry is recorded for the page content

### Requirement: Server-rendered chrome survives an auth load failure

When the server rendered a page for a signed-in user and the auth client then fails to load, the member navigation that the server rendered (the tab bar below `sm`, the header's primary links at `sm` and up) SHALL stay rendered, even though the client now reports signed out. The header's avatar SHALL be replaced by the disabled Sign in button inside the same fixed auth slot, so no header element moves (see "Stable header").

#### Scenario: Signed-in banner at 360px keeps the tab bar

- **WHEN** a signed-in user loads `/play` at 360x640 with the auth UI bundle blocked
- **THEN** the tab bar stays rendered, and no layout-shift entry is recorded

#### Scenario: Signed-in banner at 1280px keeps the header links

- **WHEN** a signed-in user loads `/play` at 1280x800 with the auth UI bundle blocked
- **THEN** the header's primary links stay rendered, Sign in replaces the avatar in the auth slot, and no layout-shift entry is recorded

#### Scenario: Signing out still removes member navigation

- **WHEN** a signed-in user whose auth client loaded normally signs out
- **THEN** the tab bar and the header's primary links are no longer rendered

### Requirement: Active room stays out of the history list

While the viewer has an active room, the History page list SHALL NOT include that room. The Playing card below the list SHALL be the only place it appears. A room that becomes active while the page is open SHALL NOT insert a row into the list.

#### Scenario: Active room is not a history row

- **WHEN** a signed-in user with active room `ABCD` and two finished rooms loads `/history`
- **THEN** the list shows the two finished rooms only, and the Playing card links to `ABCD`

#### Scenario: Room starts while viewing history

- **WHEN** a signed-in user on `/history` at 1280x800 starts a room in another tab
- **THEN** no row is added to the list and no layout-shift entry is recorded for the list rows

### Requirement: Shell chrome renders on the server

The tab bar and footer SHALL be present in the server-rendered HTML whenever the server-verified auth state and the route call for them, so they never appear after hydration and push content.

#### Scenario: Tab bar is in the SSR HTML

- **WHEN** a signed-in user's request for `/lobby` is server-rendered
- **THEN** the HTML response already contains the tab bar and the footer

#### Scenario: Room SSR has no footer or tab bar

- **WHEN** a request for `/tictactoe/ABCD` is server-rendered
- **THEN** the HTML response contains neither the tab bar nor the footer

### Requirement: Font swap without reflow

The Inter web font SHALL load without moving text when it replaces the fallback: the latin Inter file SHALL be preloaded, and the fallback font face SHALL be size-adjusted to Inter's metrics.

#### Scenario: Preloaded font

- **WHEN** any page's server-rendered HTML is fetched
- **THEN** its head contains a `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the latin Inter file

#### Scenario: Size-adjusted fallback

- **WHEN** the stylesheet is built
- **THEN** `--font-sans` lists a fallback font face declared with `size-adjust`, `ascent-override`, and `descent-override` before the generic `sans-serif`

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

When the turn passes or a round ends in any game room, the app SHALL record no layout-shift entries. The same SHALL hold when the chess promotion picker opens or closes, and when the viewer's pending move is shown, confirmed, or rolled back. The player strips (names, scores, clocks, status lines), board, and round controls SHALL keep their positions and sizes. Numbers SHALL use tabular figures in fixed-width boxes, and animations SHALL change only `transform` or `opacity`.

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

### Requirement: Player strips keep their boxes

Player strips SHALL have a fixed height and never wrap. Each strip's status line SHALL render every status variant stacked in one cell, with only visibility changing between them. Strips and the board SHALL keep one neutral border; no border or ring SHALL change with the turn.

#### Scenario: Status line keeps its box

- **WHEN** the status changes from seat 0's turn to seat 1's turn, and then to a win for seat 1
- **THEN** each strip's status line renders the same elements, exactly one variant is visible, and only visibility differs

#### Scenario: Turn ring changes no box

- **WHEN** the turn passes from seat 0 to seat 1
- **THEN** the two strips keep the same size and padding, and the strips and the board show no turn ring and the same computed border and box-shadow before and after

### Requirement: Toasts and turn alerts do not shift layout

Toasts SHALL render in a fixed-position region outside the document flow, and the your-turn alert SHALL change only the document title and play sound, so neither moves page content.

#### Scenario: Toast appears without shift

- **WHEN** the Play page shows the "Link copied" toast
- **THEN** no layout-shift entry is recorded

#### Scenario: Turn alert without shift

- **WHEN** the your-turn alert fires in a hidden tab and the tab becomes visible again
- **THEN** no layout-shift entry is recorded

### Requirement: Room overlays do not shift layout

The result card, the invite card, and the rules popover SHALL overlay the board area or float above the page, and SHALL appear and disappear with `transform` or `opacity` only, held still when reduced motion is requested.

#### Scenario: Round ends with the card

- **WHEN** two seated players finish a round at 360x640 and at 1280x800 while the layout-shift observer runs
- **THEN** the result card appears and no layout-shift entry is recorded

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is emulated and a round ends
- **THEN** the result card appears without a running animation
