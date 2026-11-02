# background-music Specification

## Purpose

An optional, quiet, procedurally generated retro loop that plays under the game sounds and follows the user's sound settings.

## Requirements

### Requirement: Music plays only when wanted and audible

The app SHALL play background music only while the `music` preference is on, the `sound` preference is on, and volume is above 0. Turning any of these off SHALL silence the music.

#### Scenario: Music off by default

- **WHEN** a user with default preferences interacts with the page
- **THEN** no music plays

#### Scenario: Sound off silences music

- **WHEN** music is playing and the user turns Sound off
- **THEN** the music fades out and stops

#### Scenario: Volume zero silences music

- **WHEN** music is playing and the user sets volume to 0
- **THEN** the music stops

### Requirement: No audio context before it is needed

The app SHALL NOT create an audio context during server rendering, and SHALL NOT create one for music while music is off, sound is off, or volume is 0.

#### Scenario: Muted page creates no audio context

- **WHEN** a page loads with music on and sound off, and the user clicks
- **THEN** no audio context is created

#### Scenario: Server render

- **WHEN** a page is rendered on the server
- **THEN** no audio context is created and no music code touches browser globals

### Requirement: Music starts after a user gesture

With music wanted and audible, the app SHALL start the music on the first pointer or key press on the page, and SHALL start it at once when the user turns music on in Settings.

#### Scenario: First gesture starts music

- **WHEN** a page loads with music and sound on and the user presses a key
- **THEN** the music starts

#### Scenario: No gesture, no music

- **WHEN** a page loads with music and sound on and the user has not interacted
- **THEN** no music plays

#### Scenario: Turning music on starts it

- **WHEN** the user turns on the Background music switch in Settings
- **THEN** the music starts without another interaction

### Requirement: Music sits under game sounds

Background music SHALL play at about one fifth of the sound volume and SHALL scale with the Volume setting.

#### Scenario: Music level follows volume

- **WHEN** volume is 0.5 and music is playing
- **THEN** the music's output level is about 0.2 times 0.5 of full scale

#### Scenario: Music routing

- **WHEN** music is playing
- **THEN** every music voice passes through a lowpass and the music level into the shared sound output

### Requirement: Smooth start and stop

The music SHALL fade in when it starts and fade out when it stops, over about one to two seconds, with no click.

#### Scenario: Fade in

- **WHEN** music starts
- **THEN** its level ramps from 0 to its target over about 1–2 seconds

#### Scenario: Fade out

- **WHEN** music stops
- **THEN** its level ramps to 0 over about 1–2 seconds before notes stop being scheduled

### Requirement: Music pauses in hidden tabs

The music SHALL pause while the document is hidden and resume when it becomes visible again, if it is still wanted and audible.

#### Scenario: Tab hidden

- **WHEN** music is playing and the user switches to another tab
- **THEN** no new notes are scheduled

#### Scenario: Tab visible again

- **WHEN** the user returns to the tab with music still on
- **THEN** the music resumes

### Requirement: Music continues across navigation

Navigating between pages SHALL NOT restart or interrupt the music.

#### Scenario: Navigate while playing

- **WHEN** music is playing and the user goes from Home to Settings
- **THEN** the loop keeps playing without restarting from the first bar

### Requirement: Chill retro loop

The music SHALL be an 8-bar loop of Fmaj7, G6, Em7, Am7 played twice at about 76 BPM, with a root bass, an 8th-note arpeggio of each chord, and a sparse melody in C major that differs between the halves, scheduled ahead on the audio clock. The loop SHALL never resolve to the C major tonic and SHALL keep pad, arpeggio, melody, and bass moving across every bar line, including the seam.

#### Scenario: Chord loop

- **WHEN** the note pattern for bars 0 to 8 is generated
- **THEN** bars 0–7 use Fmaj7, G6, Em7, Am7 twice, bars 4–7 carry a different melody from bars 0–3, and bar 8 repeats bar 0

#### Scenario: Bass on the root

- **WHEN** the note pattern for any bar is generated
- **THEN** the bass note on the first step is that bar's chord root

#### Scenario: Sparse melody

- **WHEN** the notes for one bar are generated
- **THEN** fewer than half of the steps carry a melody note, each melody pitch is in C major, and any pitch outside that bar's chord lasts at most two steps

#### Scenario: Phrases cross bar lines

- **WHEN** the note pattern for any bar is generated
- **THEN** a melody note is sounding on its first step

#### Scenario: Continuous arpeggio

- **WHEN** the note pattern for the whole loop and the first step of the next is generated
- **THEN** every 8th note starts one arpeggio note from that bar's chord lasting one 8th, so an arpeggio note is sounding on every step, including across the seam

#### Scenario: Pad crossfade

- **WHEN** the music plays across bar changes
- **THEN** each chord is still at full level just before the next bar starts, the next chord swells to full level within 0.25s while the previous one fades, and the pad's total level stays above about 85% of its mid-bar level through the change

#### Scenario: No ending at the seam

- **WHEN** the note pattern for the last bar is generated
- **THEN** its chord is not C major, its melody and bass notes run up to the first step of the next loop, and neither is on C at its last step

### Requirement: Music setting in Settings

The Sound section of Settings SHALL have a "Background music" switch bound to the `music` preference and disabled while Sound is off, and the Sound row's description SHALL say that it covers music.

#### Scenario: Switch toggles the preference

- **WHEN** the user turns on the Background music switch
- **THEN** the `music` preference becomes true and the switch shows checked

#### Scenario: Switch disabled while Sound is off

- **WHEN** the user turns Sound off
- **THEN** the Background music switch is disabled, like the Volume slider

#### Scenario: Descriptions

- **WHEN** the Settings page renders
- **THEN** the Sound row reads "Game sounds and music." and the Background music row reads "A quiet retro loop."
