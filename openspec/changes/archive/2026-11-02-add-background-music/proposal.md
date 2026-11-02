# Proposal

## Why

Games are quiet between moves. A soft retro loop under the move and turn sounds gives the app a mood that matches its look, for players who want it.

## What Changes

- A procedural chill chiptune loop (about 76 BPM, an 8-bar Fmaj7–Em7–Dm7–Cmaj7 form, soft triangle/square voices through a lowpass, triangle bass, sparse melody, no audible seam), built with Web Audio. No audio files.
- Music plays through the existing sound output on its own quieter level (about 0.2 of master), so move, capture, and turn sounds stay on top. The Sound switch and Volume slider govern it. There is no separate music volume.
- New preference `music`, default off, stored with the other preferences.
- Music starts only after a user gesture. Turning it on in Settings starts it at once. It fades in and out over about 1–2s, pauses while the tab is hidden, resumes when visible, and keeps playing across navigation.
- A "Background music" switch in the Sound section of Settings. The Sound row's description says music follows Sound and Volume.

Out of scope: a header toggle, a music volume slider, multiple tracks, any Convex change.

## Capabilities

### New Capabilities

- `background-music`: The optional background loop: when it plays, how it starts, stops, fades, and pauses, its level relative to other sounds, and its Settings control.

### Modified Capabilities

- `user-preferences`: Adds the `music` field (ADDED requirement only).

## Impact

- `src/lib/utils/sound/`: new `graph.ts` (shared lazy `AudioContext`, master gain, `configureSound`, moved from `index.ts`) and `music.ts` (pattern, scheduler, player, lifecycle binding). `index.ts` barrel gains the music exports. Existing sound functions keep their signatures.
- `src/lib/utils/storage/preferences/preferences.svelte.ts`: `music` field, `setMusic`, `applyPreferences` drives the player.
- `src/routes/+layout.svelte`: binds the gesture and visibility listeners once at the root.
- `src/lib/features/core/settings/settings.svelte`: new switch row and Sound description.
- No server, schema, or dependency changes.
