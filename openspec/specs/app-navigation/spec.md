# app-navigation Specification

## Purpose

Defines how users move around the app: the header, the current-page state of navigation links, the account menu, the live-game shortcut, the mobile tab bar, and the footer. Each destination has one navigation surface at a given viewport.

## Requirements

### Requirement: Header wordmark

The header SHALL show the twoplay wordmark as a link to `/` on every route. The wordmark SHALL be the only link to `/` in the header, tab bar, and footer.

#### Scenario: Wordmark returns home

- **WHEN** a user on `/history` activates the header wordmark
- **THEN** the app navigates to `/`

### Requirement: Current-page navigation state

A navigation link SHALL be marked current (`aria-current="page"` and a distinct visual state) when the pathname equals its href or, for hrefs other than `/`, starts with its href followed by `/`. No other link SHALL be marked current.

#### Scenario: Exact match is current

- **WHEN** the pathname is `/lobby`
- **THEN** the Lobby link has `aria-current="page"` and the Play, History, and Leaderboard links do not

#### Scenario: Home is not current on other pages

- **WHEN** the pathname is `/play`
- **THEN** a link to `/` is not marked current

#### Scenario: Prefix without segment boundary is not current

- **WHEN** the pathname is `/playground` and a link points to `/play`
- **THEN** that link is not marked current

### Requirement: Visible focus on navigation controls

Every header, tab bar, and footer link or button SHALL show a visible focus ring when focused from the keyboard.

#### Scenario: Keyboard focus is visible

- **WHEN** a user tabs onto a header navigation link
- **THEN** a focus ring is drawn around it

### Requirement: Visitor sign-in

When the viewer is signed out, the header SHALL show a Sign in button that opens the sign-in flow, and SHALL NOT show the avatar menu or member-only navigation links. The one exception is a signed-in server render followed by an auth load failure: the member navigation the server rendered stays (see `layout-stability`), and Sign in is disabled.

#### Scenario: Signed-out header

- **WHEN** a signed-out visitor loads `/`
- **THEN** the header shows a Sign in button and no Play, Lobby, History, or Leaderboard links

#### Scenario: Member links kept after a failed load

- **WHEN** the page was server-rendered for a signed-in user and the auth client then fails to load
- **THEN** the header shows a disabled Sign in button and no avatar menu, and the primary links (at `sm` and up) and the tab bar (below `sm`) stay rendered

#### Scenario: Sign in opens the auth flow

- **WHEN** a signed-out visitor activates Sign in
- **THEN** the sign-in dialog opens

### Requirement: Avatar menu

When signed in, the header SHALL show the user's avatar as a button whose accessible name includes the user's display name, opening a menu with exactly four items in order: My stats, Settings, Account, and Sign out.

#### Scenario: Avatar button has an accessible name

- **WHEN** a signed-in user named "Ada" loads any page
- **THEN** the avatar button's accessible name contains "Ada"

#### Scenario: Menu actions

- **WHEN** the user opens the avatar menu
- **THEN** My stats goes to `/me`, Settings goes to `/settings`, Account opens the account profile, and Sign out signs the user out

#### Scenario: No Support item in the menu

- **WHEN** the user opens the avatar menu
- **THEN** the menu has no Support item and no link to the Ko-fi page

### Requirement: Support link without external assets

The Support (Ko-fi) link SHALL appear only in the footer, and its icon SHALL be rendered from inline markup with no request to a third-party host.

#### Scenario: No third-party icon request

- **WHEN** any page loads
- **THEN** no network request is made to `storage.ko-fi.com`

### Requirement: Live-game pill

When the signed-in viewer has an active room, the header SHALL show a pill naming the game that links to that room. When signed out, the app SHALL NOT request the viewer's active room.

#### Scenario: Pill links to the active room

- **WHEN** a signed-in user with an active tic-tac-toe room `ABCD` is on `/history`
- **THEN** the header shows a live-game pill linking to `/tictactoe/ABCD`

#### Scenario: No pill inside that room

- **WHEN** the same user is on `/tictactoe/ABCD`
- **THEN** the live-game pill is not shown

#### Scenario: Signed-out visitors skip the query

- **WHEN** a signed-out visitor loads any page
- **THEN** no active-room query is subscribed and no pill is shown

### Requirement: Mobile tab bar

Below the `sm` breakpoint, signed-in users SHALL see a bottom tab bar with Play, Lobby, History, and Leaderboard, using the same current-page state as the header. The tab bar SHALL NOT link to `/`, because the header wordmark already does. Below `sm` the header SHALL hide its primary links, and at `sm` and wider the tab bar SHALL be hidden, so the primary links show in exactly one place at any width.

#### Scenario: Tab bar at 360px

- **WHEN** a signed-in user views `/lobby` at 360px wide
- **THEN** a bottom tab bar is visible with Lobby marked current, and the header's primary links (Play, Lobby, History, Leaderboard) are not displayed

#### Scenario: Tab bar has no Home link

- **WHEN** the tab bar renders
- **THEN** it has no link to `/`

#### Scenario: No tab bar on wide screens

- **WHEN** the same page is viewed at 1280px wide
- **THEN** no bottom tab bar is visible and the header shows the navigation links

### Requirement: Tab bar hidden in game rooms

The tab bar SHALL be hidden on game-room routes (any route with a room code segment) and shown on every other route, including the landing page.

#### Scenario: Room route hides the tab bar

- **WHEN** a signed-in user opens `/checkers/ABCD` at 360px wide
- **THEN** no bottom tab bar is rendered

#### Scenario: Landing page keeps the tab bar

- **WHEN** a signed-in user opens `/` at 360px wide
- **THEN** the bottom tab bar is rendered

### Requirement: Footer

Non-game routes SHALL show a fixed footer bar below the scrolling main region, with About, Tour, Learn, Privacy, and Terms on the left and Support on the right; below `sm` Support shows only its icon. The footer SHALL hold only existing internal pages that the header, tab bar, and avatar menu do not link, and no copyright. Game-room routes SHALL NOT render the footer.

#### Scenario: Footer links

- **WHEN** any non-game page renders
- **THEN** the footer links to `/about`, `/tour`, `/learn` (labelled "Learn"), `/privacy`, `/terms`, and the Ko-fi page

#### Scenario: Footer layout

- **WHEN** any non-game page renders at 360px or wider
- **THEN** the info links sit together on the left and Support on the right in one compact row, no copyright is shown, and the page has no horizontal scroll

#### Scenario: Support is icon-only on mobile

- **WHEN** any non-game page renders below the `sm` breakpoint
- **THEN** the Support link shows the Ko-fi icon with its "Support" label visually hidden but still in its accessible name

#### Scenario: Footer does not repeat header or tab bar links

- **WHEN** a signed-in user loads `/history`
- **THEN** the footer contains no href that the header (wordmark, primary links, or avatar menu) or the tab bar also renders

#### Scenario: Footer links resolve

- **WHEN** a user follows each internal footer link
- **THEN** every one returns a page, not a 404

#### Scenario: No footer in a room

- **WHEN** a user opens `/tictactoe/ABCD`
- **THEN** no footer is rendered

### Requirement: One navigation surface per destination

At any viewport width, each in-app destination SHALL be linked from at most one of the header (including the avatar menu), the tab bar, and the footer. The avatar menu SHALL hold only the viewer's own pages and account actions (My stats, Settings, Account, Sign out).

#### Scenario: No duplicate links on mobile

- **WHEN** a signed-in user views `/play` at 360px wide
- **THEN** among the displayed header, tab bar, and footer links, no href appears more than once

#### Scenario: No duplicate links on desktop

- **WHEN** a signed-in user views `/play` at 1280px wide
- **THEN** among the displayed header and footer links, no href appears more than once, and the tab bar is not displayed
