# Spec Delta

## Purpose

Defines how page content is framed and scrolled, and the shared page-level building blocks (page header, empty state, loading skeleton, scroll fade) that non-game pages use.

## ADDED Requirements

### Requirement: Non-game pages scroll

On every route that is not a game room, content taller than the viewport SHALL scroll vertically inside the main region while the header and tab bar stay in view.

#### Scenario: Long history scrolls

- **WHEN** `/history` content is taller than a 360x640 viewport
- **THEN** the user can scroll to the footer, and the header stays visible at the top

### Requirement: Game rooms keep a fixed frame

Game-room routes SHALL fill exactly the viewport height with no page-level scroll.

#### Scenario: Room does not scroll

- **WHEN** a player opens `/tictactoe/ABCD` at 360x640 and at 1280x800
- **THEN** the document and main region have no vertical scroll and the board fits the viewport

### Requirement: Page layout with optional sidebar

Non-game pages SHALL use a shared page layout with a centered, width-capped content column. When a page supplies a sidebar, it SHALL sit beside the content at `lg` and wider, and stack below the content under `lg`.

#### Scenario: Sidebar beside content on desktop

- **WHEN** a page with a sidebar is viewed at 1280px
- **THEN** the sidebar and content render side by side

#### Scenario: Sidebar stacks on mobile

- **WHEN** the same page is viewed at 360px
- **THEN** the sidebar renders below the content in a single column

### Requirement: Page header

Non-game pages SHALL title their content with a shared page header that renders the page title as the page's single `h1`, with an optional description and actions.

#### Scenario: One h1 per page

- **WHEN** `/leaderboard` renders
- **THEN** exactly one `h1` exists and it contains the page title

### Requirement: Empty state

When a list has no items, the page SHALL show a shared empty state with a title and description, and optionally an action.

#### Scenario: Empty history

- **WHEN** a signed-in user with no finished games opens `/history`
- **THEN** an empty state is shown with a title and description instead of an empty list

### Requirement: Loading skeleton

A skeleton placeholder SHALL be hidden from assistive technology and SHALL NOT animate when reduced motion is requested.

#### Scenario: Skeleton is decorative

- **WHEN** a skeleton renders
- **THEN** it has `aria-hidden="true"`

#### Scenario: Skeleton respects reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is set and a skeleton renders
- **THEN** it does not pulse

### Requirement: Feed scroll fade

A scrollable feed SHALL fade its top edge when scrolled away from the top and its bottom edge when more content lies below, and show no fade on an edge with nothing beyond it.

#### Scenario: Fade only where content continues

- **WHEN** a feed is scrolled to the very top and has more content below
- **THEN** the bottom edge is faded and the top edge is not

#### Scenario: Short feed has no fade

- **WHEN** a feed's content fits without scrolling
- **THEN** neither edge is faded
