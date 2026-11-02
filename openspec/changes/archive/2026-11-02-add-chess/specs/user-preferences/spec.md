## MODIFIED Requirements

### Requirement: Last play setup

Preferences SHALL store the last play setup: game, opponent (`anyone`, `friend`, or `open`), and clock minutes (3, 5, or 10). With nothing stored, or with any invalid part, the last play setup SHALL read as absent.

#### Scenario: Setup survives reload

- **WHEN** the last play setup is set to checkers, friend, 10 and preferences are read again from the same storage
- **THEN** the last play setup is checkers, friend, 10

#### Scenario: Chess setup survives reload

- **WHEN** the last play setup is set to chess, anyone, 5 and preferences are read again from the same storage
- **THEN** the last play setup is chess, anyone, 5

#### Scenario: Invalid setup ignored

- **WHEN** the stored last play setup has game `backgammon`
- **THEN** the last play setup reads as absent and sound keeps its stored value
