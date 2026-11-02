## ADDED Requirements

### Requirement: Background music preference

The preferences store SHALL hold a `music` boolean that defaults to false, persists across reloads, falls back to false when the stored value is missing or not a boolean, and is written without dropping any other stored field.

#### Scenario: Music defaults off

- **WHEN** a browser with no stored preferences loads the app
- **THEN** the `music` preference is false

#### Scenario: Music choice survives reload

- **WHEN** the user turns music on and reloads the page
- **THEN** the `music` preference is true

#### Scenario: Invalid music value ignored

- **WHEN** storage holds `music: "yes"`
- **THEN** the `music` preference is false and every other valid stored field is kept

#### Scenario: Music change keeps other fields

- **WHEN** the user turns music on while volume is 0.4 and motion is "reduce"
- **THEN** storage still holds volume 0.4 and motion "reduce"
