# Spec Delta

## MODIFIED Requirements

### Requirement: Detect the viewer's turn arriving

The alert SHALL fire only on a transition from not-the-viewer's-turn to the viewer's turn in the live round while the tab is hidden. It SHALL NOT fire for spectators, on first load, or when the tab is visible. The turn SHALL be the server-confirmed turn: a pending move of the viewer's, and its rollback, SHALL NOT count as a turn change.

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

#### Scenario: Rejected move while tab hidden

- **WHEN** the viewer moves, the tab becomes hidden, and the server rejects the pending move
- **THEN** no alert fires, because the confirmed turn stayed with the viewer
