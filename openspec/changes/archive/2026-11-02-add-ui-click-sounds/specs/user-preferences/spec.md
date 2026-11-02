## ADDED Requirements

### Requirement: Click sounds preference

The preferences store SHALL hold a `uiSounds` boolean that defaults to true, persists across reloads, falls back to true when the stored value is missing or not a boolean, and is written without dropping any other stored field.

#### Scenario: Click sounds default on

- **WHEN** a browser with no stored preferences loads the app
- **THEN** the `uiSounds` preference is true

#### Scenario: Click sounds choice survives reload

- **WHEN** the user turns click sounds off and reloads the page
- **THEN** the `uiSounds` preference is false

#### Scenario: Invalid click sounds value ignored

- **WHEN** storage holds `uiSounds: "no"`
- **THEN** the `uiSounds` preference is true and every other valid stored field is kept

#### Scenario: Click sounds change keeps other fields

- **WHEN** the user turns click sounds off while volume is 0.4 and music is on
- **THEN** storage still holds volume 0.4 and music true
