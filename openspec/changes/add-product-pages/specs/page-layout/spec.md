# Spec Delta

## MODIFIED Requirements

### Requirement: Non-game pages scroll

On every route that is not a game room, content taller than the viewport SHALL scroll vertically inside the main region while the header, the footer, and the tab bar stay in view. The footer SHALL sit between the main region and the tab bar, outside the scrolling region.

#### Scenario: Long history scrolls

- **WHEN** `/history` content is taller than a 360x640 viewport
- **THEN** the user can scroll to the end of the content, and the header, footer, and tab bar stay visible

#### Scenario: Footer stays in view

- **WHEN** a signed-in user scrolls `/history` at 360x640
- **THEN** the footer stays directly above the tab bar and does not move
