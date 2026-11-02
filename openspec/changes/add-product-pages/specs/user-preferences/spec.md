# Spec Delta

## MODIFIED Requirements

### Requirement: Preference defaults

When no preferences are stored, the app SHALL use the defaults: sound on, volume 100%, your-turn alert on, motion follows the system, new-game opponent Matchmaking, and new-game clock 5 minutes.

#### Scenario: Fresh browser

- **WHEN** preferences are read with nothing stored
- **THEN** sound is on, volume is 100%, the turn alert is on, motion follows the system, the new-game opponent is Matchmaking, and the new-game clock is 5 minutes

## ADDED Requirements

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
