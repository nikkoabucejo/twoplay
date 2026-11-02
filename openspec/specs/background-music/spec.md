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

The music SHALL be an 8-bar loop of Fmaj7, G6, Em7, Am7 played twice at about 76 BPM, with a root bass, an 8th-note arpeggio of each chord, and a sparse melody in C major that differs between the halves, scheduled ahead on the audio clock. The loop SHALL never resolve to the C major tonic and SHALL keep pad, arpeggio, melody, and bass moving across every bar line, including the seam. This is the default scene's arrangement. Other scenes re-arrange the same loop.

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

### Requirement: Music follows the scene

The music SHALL play one of five scenes picked from the viewer's state: win, lose, or draw while the board shows a live round that ended with that result for the viewer, searching while the viewer is queued for a quick match, and default otherwise. A round result SHALL take precedence over searching. A spectator's view of a finished round and a closed room SHALL use default.

#### Scenario: Searching for a match

- **WHEN** the viewer is queued for a quick match
- **THEN** the music scene is searching

#### Scenario: Match found

- **WHEN** a quick match is found and the room's first round starts
- **THEN** the music scene returns to default

#### Scenario: Win, lose, and draw

- **WHEN** the live round ends and the viewer won, lost, or drew
- **THEN** the music scene is win, lose, or draw respectively

#### Scenario: Result over searching

- **WHEN** the viewer has a round result and is also marked as searching
- **THEN** the music scene is the result's scene

#### Scenario: Spectator and closed room

- **WHEN** a spectator sees a finished round, or the room closes
- **THEN** the music scene is default

### Requirement: Result scene duration

A result scene SHALL last while the board shows that ended round, including after the result card is dismissed, and SHALL return to default when the next round starts, the viewer leaves the room, or another room loads.

#### Scenario: Result card dismissed

- **WHEN** the viewer hides the result card and keeps looking at the ended round
- **THEN** the music scene stays win, lose, or draw

#### Scenario: Next round or leaving

- **WHEN** a rematch starts the next round, or the viewer leaves the room
- **THEN** the music scene returns to default

### Requirement: One song across scenes

A scene change SHALL NOT restart or reposition the loop. Every scene SHALL play the same 8-bar loop in the same key with the same 4 chord slots, continuing from the current step, and SHALL keep the music level's target and its scaling with Volume unchanged.

#### Scenario: Scene change keeps the position

- **WHEN** the scene changes while music is playing
- **THEN** the step after the last one scheduled is the next one played, in the new arrangement, and no step is skipped or played twice

#### Scenario: Scenes stay under game sounds

- **WHEN** music plays in any scene
- **THEN** the music level still targets about 0.2 of the sound volume, and no arrangement plays above full level

### Requirement: Scene arrangements

Each scene SHALL be its own arrangement of the loop: the rhythm of every base voice, the tempo, the swing, the chord colour, and the lowpass SHALL change with the scene, rather than layers being added over an unchanged loop. Default SHALL be the existing loop.

#### Scenario: Default is unchanged

- **WHEN** the default scene plays
- **THEN** the notes, tempo (76 BPM), swing, and lowpass (about 1400 Hz) match the loop before scenes existed, with no stab, bell, or hi-hat

#### Scenario: Searching drives

- **WHEN** the searching scene plays a bar
- **THEN** the tempo is 100 BPM with no swing, an arpeggio note starts on every 16th, the pad plays short chord stabs with a hi-hat on each offbeat 8th, the bass plays a syncopated figure on steps 0, 3, 6, 8, 11, and 14, the melody plays the bar's first four melody notes as a short riff, and the lowpass sits at about 2.8 kHz

#### Scenario: Win lifts

- **WHEN** the win scene plays a bar
- **THEN** the tempo is 90 BPM, the Em7 slot resolves to the C tonic, the arpeggio climbs through two octaves, the bass bounces between a root and its octave, the melody plays an octave above default on the same steps, bells ring, and the lowpass sits at about 3.2 kHz

#### Scenario: Lose deflates

- **WHEN** the lose scene plays a bar
- **THEN** the tempo is 62 BPM, the Fmaj7 slot is Fm6 and the Em7 slot is Ebmaj7, the bass holds one root for the whole bar, the arpeggio falls in quarter notes, the melody is two falling notes, the bar has fewer notes than in default, and the lowpass sits at about 650 Hz

#### Scenario: Draw hovers

- **WHEN** the draw scene plays a bar
- **THEN** the tempo is 76 BPM with no swing, every chord is suspended with no third above its root, the arpeggio moves in quarter notes, the bass plays on beats 1 and 3, the melody repeats one pitch, and the lowpass sits at about 1 kHz

#### Scenario: Hi-hat cuts through

- **WHEN** a hi-hat plays
- **THEN** it is a short noise burst through a highpass at about 7 kHz into the music gain, bypassing the lowpass

### Requirement: Quick, smooth scene transitions

A scene change SHALL take effect on the loop's next beat. From that beat the new arrangement SHALL play, the previous arrangement's sounding notes SHALL fade out within about 0.2 s, the new arrangement's held pad and bass SHALL start at once, the tempo SHALL glide to the new BPM over about 2 beats, and the lowpass SHALL sweep from its current value to the new cutoff in about 0.4 s. A change that arrives during another transition SHALL continue from the current tempo and cutoff with no jump.

#### Scenario: Change lands on the beat

- **WHEN** the scene changes between two beats
- **THEN** the switch happens at the time of the next beat on the loop's grid, not at the moment of the call, and within one beat plus the scheduling lookahead

#### Scenario: Arrangement switch

- **WHEN** the scene changes from default to searching
- **THEN** the notes before the boundary are default's, the notes from the boundary on are searching's, and the default notes still sounding fade out from the boundary

#### Scenario: Tempo glide

- **WHEN** the scene changes from default to searching
- **THEN** each step after the boundary is no longer than the one before it, from about 0.197 s to 0.15 s over 8 steps

#### Scenario: Rapid changes

- **WHEN** the scene goes through several scenes within half a second
- **THEN** the cutoff ramps from the value that was sounding, every note envelope starts at 0, no step plays twice, and the last scene's arrangement and tempo end up playing

### Requirement: Scene changes while silent

A scene change while the music is paused, off, or not yet started SHALL be remembered and applied when the music next plays, and SHALL NOT create an audio context or schedule notes.

#### Scenario: Hidden tab

- **WHEN** the tab is hidden, the round ends in a win, and the user returns to the tab
- **THEN** the music resumes in the win arrangement, tempo, and cutoff, with no sweep from default

#### Scenario: Music off

- **WHEN** music is off and the scene changes
- **THEN** no audio context is created and no notes are scheduled
