# Spec Delta

## Purpose

Defines what the landing page at `/` shows: a marketing landing for signed-out visitors and a home view for signed-in users, both listing the games.

## ADDED Requirements

### Requirement: Hero with pitch

The landing page SHALL show a hero with the wordmark as its single `h1` and a one-sentence pitch. The hero SHALL have no actions of its own; the game cards are how a game starts.

#### Scenario: Wordmark is the only h1

- **WHEN** `/` renders
- **THEN** it has exactly one `h1`, reading "TWOPLAY"

#### Scenario: No duplicate actions

- **WHEN** `/` renders for a signed-out visitor
- **THEN** the page content has no buttons, and signed in, its only links are the game cards

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

### Requirement: Responsive arrangement

From the `lg` breakpoint, the hero SHALL sit in a left column and the game cards in a right column. Below `lg`, the hero, the game cards, and "How it works" SHALL stack in that order in one column with no horizontal scroll.

#### Scenario: Two columns on desktop

- **WHEN** `/` is viewed at 1280x800
- **THEN** the hero's box is left of the game cards' box and their vertical ranges overlap

#### Scenario: One column on phones

- **WHEN** `/` is viewed at 360x640
- **THEN** the hero is above the game cards, the cards are above "How it works", and the document has no horizontal scroll

### Requirement: Landing motion

A game card's hover SHALL animate only `opacity`. When reduced motion is requested, the wordmark glow SHALL NOT run and the board previews SHALL stay static.

#### Scenario: Reduced motion on the landing

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/` is loaded and a game card is hovered
- **THEN** the wordmark and board previews have no running animation and are still visible, and the card's only transition is on `opacity`
