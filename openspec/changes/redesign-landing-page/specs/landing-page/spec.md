# Spec Delta

## Purpose

Defines what the landing page at `/` shows: a marketing landing for signed-out visitors and a home view for signed-in users, both listing the games.

## ADDED Requirements

### Requirement: Hero with pitch and actions

The landing page SHALL show a hero with the wordmark as its single `h1`, a one-sentence pitch, and two actions, "Quick match" and "Play a friend". For a signed-out visitor, each action SHALL open the sign-in flow, and both SHALL be disabled while the auth client has failed to load.

#### Scenario: Signed-out actions open sign-in

- **WHEN** a signed-out visitor on `/` clicks "Quick match" or "Play a friend"
- **THEN** the sign-in flow opens and the URL stays `/`

#### Scenario: Actions disabled on auth load failure

- **WHEN** the auth client fails to load for a signed-out visitor on `/`
- **THEN** "Quick match" and "Play a friend" are disabled

### Requirement: Game cards

The landing page SHALL show one card per game to every viewer, signed in or out. Each card SHALL show the game's name, its one-line description, and a decorative board preview hidden from assistive technology, and SHALL link to `/play?game=<type>`.

#### Scenario: Cards link with the game preselected

- **WHEN** `/` renders for a signed-out visitor and for a signed-in user
- **THEN** both show a Tic-Tac-Toe card linking to `/play?game=tictactoe` and a Checkers card linking to `/play?game=checkers`, each with its description

#### Scenario: Picking a game once

- **WHEN** a signed-in user clicks the Checkers card on `/`
- **THEN** `/play` opens with Checkers selected

### Requirement: How it works

For a signed-out visitor, the landing page SHALL show a "How it works" section with three numbered steps. Signed-in users SHALL NOT see it.

#### Scenario: Three steps when signed out

- **WHEN** `/` renders for a signed-out visitor
- **THEN** a "How it works" heading is followed by exactly three steps

#### Scenario: Hidden when signed in

- **WHEN** `/` renders for a signed-in user
- **THEN** no "How it works" heading is present

### Requirement: Resume your game

When a signed-in user has an active room, the hero's action slot SHALL show a "Resume your game" banner naming the game and linking to that room, in place of the two actions. Without an active room, the slot SHALL show the two actions, each linking to `/play`.

#### Scenario: Active room shows the banner

- **WHEN** a signed-in user with an active checkers room `ABCD` loads `/`
- **THEN** the page shows "Resume your game" with a link to `/checkers/ABCD`, and no "Quick match" action

#### Scenario: No active room shows the actions

- **WHEN** a signed-in user with no active room loads `/`
- **THEN** "Quick match" and "Play a friend" link to `/play` and no resume banner is shown

#### Scenario: Banner arrives without shift

- **WHEN** a signed-in user with an active room loads `/` at 360x640 and at 1280x800 and the active-room query resolves after first paint
- **THEN** no layout-shift entry is recorded for the game cards or anything below the action slot

### Requirement: Responsive arrangement

From the `lg` breakpoint, the hero SHALL sit in a left column and the game cards in a right column. Below `lg`, the hero, the game cards, and "How it works" SHALL stack in that order in one column with no horizontal scroll.

#### Scenario: Two columns on desktop

- **WHEN** `/` is viewed at 1280x800
- **THEN** the hero's box is left of the game cards' box and their vertical ranges overlap

#### Scenario: One column on phones

- **WHEN** `/` is viewed at 360x640
- **THEN** the hero is above the game cards, the cards are above "How it works", and the document has no horizontal scroll

### Requirement: Landing motion

Any animation on the landing page SHALL change only `transform` or `opacity`, and SHALL NOT run when reduced motion is requested.

#### Scenario: Reduced motion on the landing

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/` is loaded and a game card is hovered
- **THEN** the board previews, cards, and wordmark have no running animation or transition and are still visible
