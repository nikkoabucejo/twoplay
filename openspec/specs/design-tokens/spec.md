# design-tokens Specification

## Purpose

Keeps the two seat colors and the small caption text size defined once, so every board, emblem, animation, and label renders the same values.

## Requirements

### Requirement: Single source for seat colors

Seat 0 and seat 1 colors SHALL be defined once as theme tokens, and every place that renders a seat color (board marks, accents, emblems, sparkles, mood blobs, game metadata) SHALL resolve to those two values.

#### Scenario: Script-side colors match the stylesheet

- **WHEN** the seat colors used by script-driven rendering are compared with the stylesheet's seat tokens
- **THEN** seat 0 and seat 1 are identical in both

#### Scenario: Game metadata uses seat colors

- **WHEN** any game's display colors are read
- **THEN** they equal the seat 0 and seat 1 colors in order

#### Scenario: No stray seat literals

- **WHEN** non-test files under `src/`, other than the stylesheet and script token definitions and `src/lib/assets/favicon.svg` (a standalone SVG cannot read CSS tokens), are searched for the seat hex values and `cyan-500` / `pink-500` classes
- **THEN** there are no matches

### Requirement: Single caption size

Small caption text SHALL use one named caption size token. Arbitrary `text-[10px]` and `text-[11px]` sizes SHALL NOT appear in source.

#### Scenario: Arbitrary caption sizes removed

- **WHEN** the source tree is searched for `text-[10px]` and `text-[11px]`
- **THEN** there are no matches

### Requirement: Selection ring

The comet ring SHALL mark items that are or can become selected. A selected item SHALL show the spark running in seat colors. An unselected item that can be selected SHALL show the spark running in muted colors while hovered. Items that cannot be selected SHALL NOT show the comet ring.

#### Scenario: Hover runs a muted ring

- **WHEN** the `hover-ring` utility is read
- **THEN** on hover it shows the comet ring with the spark running, and its colors are neutral instead of seat colors

#### Scenario: Selected ring keeps seat colors

- **WHEN** the `selected-ring` utility is read
- **THEN** it shows the comet ring running in seat colors

#### Scenario: Plain links have no ring

- **WHEN** a home game card, the about GitHub link, a rules door, or a trash-talk emoji button is rendered
- **THEN** it does not have the `hover-ring` class

#### Scenario: Reduced motion

- **WHEN** reduced motion is on and a selectable item is hovered
- **THEN** the ring is still
