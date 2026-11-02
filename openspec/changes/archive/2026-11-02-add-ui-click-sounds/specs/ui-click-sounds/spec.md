## Purpose

A soft tick when the user activates a UI control, so buttons and links give audible feedback that follows the user's sound settings.

## ADDED Requirements

### Requirement: Interactive controls tick

When the user activates a button, link, switch, tab, menu item, radio, checkbox, or option, by pointer or keyboard, the app SHALL play one click tick.

#### Scenario: Button click

- **WHEN** the user clicks a button
- **THEN** one click tick plays

#### Scenario: Click inside a control

- **WHEN** the user clicks the icon inside a link
- **THEN** one click tick plays

#### Scenario: Keyboard activation

- **WHEN** the user focuses a button and presses Enter or Space
- **THEN** one click tick plays

#### Scenario: Non-interactive click

- **WHEN** the user clicks plain text or the page background
- **THEN** no tick plays

### Requirement: Silent controls

The app SHALL NOT tick for a control that is disabled, `aria-disabled="true"`, inert, inside a region marked `data-sfx="off"`, or activated by script rather than the user. Game boards SHALL be marked `data-sfx="off"`, so a board cell plays only its move sound.

#### Scenario: Disabled control

- **WHEN** the user clicks a disabled or `aria-disabled="true"` button
- **THEN** no tick plays

#### Scenario: Board cell

- **WHEN** the user clicks a cell on a tic-tac-toe, checkers, or How to play practice board
- **THEN** no click tick plays

#### Scenario: Scripted click

- **WHEN** code calls `click()` on a button
- **THEN** no tick plays

### Requirement: Ticks follow sound settings

The app SHALL tick only while the `uiSounds` preference is on, the `sound` preference is on, and volume is above 0, and SHALL NOT create an audio context for a tick otherwise.

#### Scenario: Click sounds off

- **WHEN** `uiSounds` is off and the user clicks a button
- **THEN** no tick plays

#### Scenario: Muted page creates no audio context

- **WHEN** sound is off, or volume is 0, and the user clicks a button
- **THEN** no tick plays and no audio context is created

### Requirement: Soft tick

The tick SHALL be a single short tone of at most 40ms, pitched in C major, whose peak level is below the move sound's, with a ramped attack and release so it does not click.

#### Scenario: Tick shape

- **WHEN** a tick plays
- **THEN** it is one sine or triangle tone in C major, it ends within 40ms, its gain ramps up from 0 and back to near 0, and its peak gain is between 0.035 and 0.04

### Requirement: Click sounds setting

The Sound section of Settings SHALL have a "Click sounds" switch, after "Background music", bound to the `uiSounds` preference and disabled while Sound is off.

#### Scenario: Switch toggles the preference

- **WHEN** the user turns off the Click sounds switch
- **THEN** the `uiSounds` preference becomes false and the switch shows unchecked

#### Scenario: Switch disabled while Sound is off

- **WHEN** the user turns Sound off
- **THEN** the Click sounds switch is disabled
