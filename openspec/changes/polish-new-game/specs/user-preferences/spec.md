# Spec Delta

## ADDED Requirements

### Requirement: Last play setup

Preferences SHALL store the last play setup: game, opponent (`anyone`, `friend`, or `open`), and clock minutes (3, 5, or 10). With nothing stored, or with any invalid part, the last play setup SHALL read as absent.

#### Scenario: Setup survives reload

- **WHEN** the last play setup is set to checkers, friend, 10 and preferences are read again from the same storage
- **THEN** the last play setup is checkers, friend, 10

#### Scenario: Invalid setup ignored

- **WHEN** the stored last play setup has game `chess`
- **THEN** the last play setup reads as absent and sound keeps its stored value

### Requirement: Writes keep other fields

Writing one preference SHALL keep every other stored preference.

#### Scenario: Sound change keeps the setup

- **WHEN** a last play setup is stored and sound is turned off
- **THEN** reading again returns sound off and the same last play setup
