# user-preferences Specification

## Purpose

Stores per-browser user preferences (starting with sound) so they persist across visits and can later be edited from a settings page.

## Requirements

### Requirement: Preference defaults

When no preferences are stored, the app SHALL use the defaults: sound on, volume 100%, your-turn alert on, motion follows the system, new-game opponent Matchmaking, and new-game clock 5 minutes.

#### Scenario: Fresh browser

- **WHEN** preferences are read with nothing stored
- **THEN** sound is on, volume is 100%, the turn alert is on, motion follows the system, the new-game opponent is Matchmaking, and the new-game clock is 5 minutes

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

### Requirement: Settings page

`/settings` SHALL let any visitor change each preference: sound on/off, volume, your-turn alert on/off, reduced motion (follow the system or always), and new-game opponent (Matchmaking, Public, Private) and clock (3, 5, 10 minutes). Each change SHALL save immediately, with no save button.

#### Scenario: Change survives reload

- **WHEN** a visitor sets volume to 40% on `/settings` and reloads
- **THEN** the volume control shows 40%

### Requirement: Field values are validated

A stored volume outside 0–100%, or a motion, opponent, or clock value outside its options, SHALL read as that field's default, and the other fields SHALL be kept.

#### Scenario: Out-of-range volume

- **WHEN** the stored preferences are `{"sound":false,"volume":7}`
- **THEN** sound reads as off and volume reads as the default

### Requirement: Sound preferences drive sounds

Every app sound SHALL play at the volume preference. When sound is off or volume is 0%, no sound SHALL play.

#### Scenario: Sound off silences moves

- **WHEN** sound is off and a move sound is requested
- **THEN** no audio is played

#### Scenario: Volume scales output

- **WHEN** volume is 40% and a move sound plays
- **THEN** the sound's output gain is 0.4 of its full level

### Requirement: Forced reduced motion

When reduced motion is set to always, the app SHALL treat the page as reduced-motion regardless of the system setting: `motion-safe` styles SHALL NOT apply, `motion-reduce` styles SHALL apply, and CSS animations and transitions SHALL end immediately. When set to follow the system, only the system setting SHALL decide.

#### Scenario: Always reduce on a full-motion system

- **WHEN** the system allows motion and reduced motion is set to always
- **THEN** a skeleton does not pulse

#### Scenario: Follow the system

- **WHEN** reduced motion is set back to follow the system on a full-motion system
- **THEN** a skeleton pulses again

### Requirement: Settings metadata

`/settings` SHALL render the title `Settings · twoplay` and a description.

#### Scenario: Settings title

- **WHEN** `/settings` renders
- **THEN** the document title is `Settings · twoplay`

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
