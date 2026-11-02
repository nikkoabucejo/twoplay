# Spec Delta

## ADDED Requirements

### Requirement: Turn alert preference

When the your-turn alert preference is off, the alert SHALL NOT fire: no title flash and no chime.

#### Scenario: Alert turned off

- **WHEN** the turn alert preference is off, the tab is hidden, and the turn passes to the viewer
- **THEN** the title does not change and no chime plays
