# Proposal

## Why

The background loop sounds the same while you search for a match, play, win, or lose. Letting the same song change its groove, tempo, and harmony with the moment makes the music follow the game, the way the mood background already does.

## What Changes

- Five music scenes: default, searching, win, lose, and draw. Each is an arrangement of the same song: the same key, the same 8 chord slots, and the same bar position. Searching and win play the theme's melody notes; lose and draw thin it to sighs and held notes. A scene change never restarts the loop. It changes how the base voices play: their rhythm, the tempo, the swing, the chord colour, and the lowpass.
- Default is today's loop, unchanged.
- Searching speeds up to 100 BPM. The arpeggio drives in straight 16ths, the bass pumps a syncopated 3-3-2 figure, the pad turns into offbeat stabs with a hi-hat, and the melody shrinks to a short riff of each bar's first four notes. The lowpass opens to 2.8 kHz.
- Win settles at 90 BPM. The Em7 slot resolves to the tonic (Fmaj7, G7, Cadd9, Am7), the bass bounces in dotted 8ths between octaves, the arpeggio climbs two octaves per bar, the melody plays an octave up, and bells ring on the offbeats. The lowpass opens to 3.2 kHz.
- Lose slows to 62 BPM. The chords borrow from C minor (Fm6, G6, Ebmaj7, Am7), the bass holds one note per bar, the arpeggio falls in quarter notes, and the melody shrinks to a two-note sigh per bar. The lowpass closes to 650 Hz.
- Draw stays at 76 BPM with no swing. Every chord is suspended (Fsus2, Gsus4, Em7sus4, Asus4), the arpeggio and bass move in even quarters and halves, and the melody hovers on one repeated note per bar. The lowpass closes to 1 kHz.
- A scene change lands on the next beat. From there the new arrangement plays, the old one's notes fade out in about 0.15 s, the tempo glides to the new BPM over 8 steps, and the lowpass sweeps from its current value in 0.4 s. Rapid changes never click or skip a step.
- The scene comes from the app's state. A finished round the viewer won, lost, or drew picks win, lose, or draw. It lasts while the board shows that ended round, also after the result card is dismissed. Queued for a quick match picks searching. Everything else, including spectating a finished round and a closed room, is default.
- The mood presence gains a viewer-relative `outcome` that the board publishes, next to the existing `status` and `searching`.

Out of scope: new tracks or audio files, a scene or music setting, a change to the music level or the Sound and Volume rules, scene sync between players, and any Convex change.

## Capabilities

### New Capabilities

none

### Modified Capabilities

- `background-music`: Adds the scene requirements (what picks a scene, each scene's arrangement, quick transitions on the beat, behavior while paused) and scopes the "Chill retro loop" mix to the default scene.

## Impact

- `src/lib/utils/sound/music.ts`: `MusicScene`, `musicSceneOf`, `stepSeconds`, `heldAt`, `notesForStep(step, scene)` with one arrangement per scene, `MusicPlayer.setScene`, a tempo glide, a gain per arrangement, and a noise hi-hat on its own highpass. `src/lib/utils/sound/index.ts` exports `musicSceneOf` and `type MusicScene`.
- `src/lib/features/presence/mood/mood.svelte.ts`: `MoodPresence.outcome`.
- `src/lib/components/layout/board/outcome.ts` and `board.svelte`: a pure `moodOutcome` and an `$effect` that publishes it.
- `src/routes/+layout.svelte`: one `$effect` that feeds the scene to the player.
- No schema change, no auth or trust-boundary change, no new public Convex function, no dependency.
