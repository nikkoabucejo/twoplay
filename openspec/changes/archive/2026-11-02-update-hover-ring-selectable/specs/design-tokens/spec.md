## ADDED Requirements

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
