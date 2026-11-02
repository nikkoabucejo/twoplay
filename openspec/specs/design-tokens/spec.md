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
