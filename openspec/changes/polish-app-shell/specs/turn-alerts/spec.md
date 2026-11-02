# Spec Delta

## Purpose

Tells a seated player that it has become their turn while the game's browser tab is in the background, through the tab title and an optional chime.

## ADDED Requirements

### Requirement: Detect the viewer's turn arriving

The alert SHALL fire only on a transition from not-the-viewer's-turn to the viewer's turn in the live round while the tab is hidden. It SHALL NOT fire for spectators, on first load, or when the tab is visible.

#### Scenario: Opponent moves while tab hidden

- **WHEN** the viewer is seated, the tab is hidden, and the turn passes from the opponent to the viewer
- **THEN** the alert fires once

#### Scenario: Tab visible

- **WHEN** the turn passes to the viewer while the tab is visible
- **THEN** no alert fires

#### Scenario: Spectator

- **WHEN** a spectator's tab is hidden and the turn changes
- **THEN** no alert fires

#### Scenario: Already the viewer's turn on load

- **WHEN** the room first loads in a hidden tab and it is already the viewer's turn
- **THEN** no alert fires

### Requirement: Title flash

While an alert is active, the document title SHALL alternate between a "Your turn" title and the page's original title. When the tab becomes visible, the turn leaves the viewer, or the room is left, the flashing SHALL stop and the original title SHALL be restored.

#### Scenario: Flash then restore

- **WHEN** an alert is active and the tab becomes visible
- **THEN** the title stops alternating and equals the original title

### Requirement: Turn chime

When an alert fires and the sound preference is on, the app SHALL play one short synthesized chime. When sound is off, no chime SHALL play; the title flash still runs.

#### Scenario: Sound on

- **WHEN** an alert fires with sound on
- **THEN** the chime plays once

#### Scenario: Sound off

- **WHEN** an alert fires with sound off
- **THEN** no chime plays and the title flashes
