# Spec Delta

## Purpose

Stores per-browser user preferences (starting with sound) so they persist across visits and can later be edited from a settings page.

## ADDED Requirements

### Requirement: Preference defaults

When no preferences are stored, the app SHALL use the defaults: sound on.

#### Scenario: Fresh browser

- **WHEN** preferences are read with nothing stored
- **THEN** sound is on

### Requirement: Preferences persist

Changing a preference SHALL save it in browser storage so a later read in the same browser returns the changed value.

#### Scenario: Sound off survives reload

- **WHEN** sound is turned off and preferences are read again from the same storage
- **THEN** sound is off

### Requirement: Malformed storage falls back

A stored value that is not valid JSON, not an object, or has a wrong-typed field SHALL be replaced by the default for each invalid field, without throwing. Valid fields SHALL be kept.

#### Scenario: Corrupt JSON

- **WHEN** the stored preferences are the string `not json`
- **THEN** reading returns the defaults and does not throw

#### Scenario: Wrong field type

- **WHEN** the stored preferences are `{"sound":"yes"}`
- **THEN** sound reads as the default (on)

### Requirement: Storage unavailable

When browser storage is unavailable or throws (server rendering, privacy mode), preferences SHALL read as defaults and writes SHALL be ignored without error.

#### Scenario: Storage throws

- **WHEN** storage access throws on read and write
- **THEN** reading returns the defaults and writing does not throw
