# Design

## Context

`src/lib/utils/sound/index.ts` owns one lazy `AudioContext` and master gain (`getGraph`, SSR-safe via `typeof window`), a module-level `settings` set by `configureSound`, and `getAudibleGraph`, which returns null when muted so a muted page never creates a context. `applyPreferences` in `preferences.svelte.ts` pushes `sound` and `volume` into `configureSound` from an `$effect`. `setupPreferences()` runs once in `src/routes/+layout.svelte`, which persists across navigation.

## Goals / Non-Goals

**Goals:** a pure, testable note pattern; a lookahead scheduler on `ctx.currentTime`; one player owned at the root; no new assets or dependencies.

**Non-Goals:** a music volume control, several tracks, a header toggle, syncing music between players.

## Decisions

### 1. Procedural Web Audio over an audio file

- Chosen: synthesize the loop with oscillators. No asset to host, license, or preload, and the timbre matches the existing synthesized move sounds.
- Rejected: a looping MP3/OGG. It adds bytes and a license question, `<audio>` loops click at the seam, and it can't share the master gain without `MediaElementAudioSourceNode` plumbing.

### 2. Shared graph moves to `graph.ts`

`music.ts` needs `getGraph` and the current settings. Importing them from `index.ts` while `index.ts` re-exports `music.ts` makes an import cycle. So `audio`, `settings`, `getGraph`, `getAudibleGraph`, `configureSound`, and the `SoundGraph` type move unchanged to `src/lib/utils/sound/graph.ts`. `index.ts` imports them and keeps `prepareSound`, `playMoveSound`, `playCaptureSound`, and `playTurnChime`. The barrel's public names stay the same, and the existing `index.test.ts` guards the move. The barrel adds only `bindMusicLifecycle`, `music`, and `type MusicPlayer`. `notesForStep` and `Note` stay internal to `music.ts` and its test. `configureSound` glides master to the new volume with `setTargetAtTime(volume, currentTime, 0.02)` so slider drags do not click, and `getGraph` resumes any context that is not running.

- Rejected: exporting `getGraph` from `index.ts` and importing it into `music.ts` (cycle).
- Rejected: a second `AudioContext` for music (browsers cap contexts, and Volume would need wiring twice).

### 3. Module layout (`src/lib/utils/sound/music.ts`)

- `notesForStep(step: number): Note[]` is pure. 16 steps per bar (sixteenth notes at 76 BPM) over an 8-bar form: Fmaj7, Em7, Dm7, Cmaj7, played twice (bar = `Math.floor(step / 16) % 8`). Each note gives `{ voice: "pad" | "bass" | "lead", frequency, duration }`. The pad sounds the chord on step 0 (triangle, plus a quiet square an octave up). The bass sounds the root an octave down on steps 0 and 8 (triangle, peak 0.15, so it carries on phone speakers), and in bar 8 walks C, G, E into the F that restarts the loop. The lead comes from a fixed per-bar table of MIDI notes in C major (fewer than 8 of 16 steps), so tests can assert it without randomness. Bars 1–4 use chord tones. Bars 5–8 add short passing tones and entries on odd steps so the swing is heard, and end on a pickup into bar 1.
- Loop seam: the pad attacks in 0.06s, holds full level for the whole bar, and releases with a 0.04s time constant from the bar's end, so consecutive chords crossfade in about 0.12s with no dip. The lead and bass in bar 8 run up to the seam, so nothing decays or sounds like an ending before the loop restarts.
- `MusicPlayer` class with `#private` state, constructed with `{ getGraph: () => SoundGraph | null, setTimer, clearTimer }` so tests inject a fake context and fake timers. The default instance `music` uses `graph.ts` and `window.setTimeout`.
  - `setWanted(isWanted: boolean)`: the preference, combined with audibility. When false, it fades out and stops. When true and unlocked, it starts.
  - `unlock()`: called on the first gesture. It starts if wanted.
  - `setHidden(isHidden: boolean)`: hidden fades out and pauses the scheduler. Visible resumes if wanted and unlocked.
  - Signal path: voice nodes → lowpass `BiquadFilterNode` (1400 Hz) → music gain → master. The music gain targets `MUSIC_LEVEL = 0.2` and uses `linearRampToValueAtTime` over 1.5s for fades. Master already carries `volume`, so level = 0.2 × volume.
  - Scheduler: a 25ms timer tick schedules every step whose time is less than `ctx.currentTime + 0.15`, using `start(time)` and `stop(time)` on the audio clock. The step counter keeps running across pause and resume within a page load, so navigation never resets it.
  - `getGraph` is called only inside `start`, which runs only when wanted, audible, and unlocked. A muted or off state never creates a context.
- `bindMusicLifecycle(target: Pick<Document, "addEventListener" | "removeEventListener" | "hidden">, player)` adds `pointerdown`, `pointerup`, and `keydown` listeners that call `player.unlock()` on every gesture and stay bound until cleanup, plus a `visibilitychange` listener that calls `player.setHidden(target.hidden)`. It returns a cleanup function.
  - Revised after verification: the gesture listeners (`pointerdown`, `pointerup`, `keydown`) stay bound until cleanup, and every `unlock()` resumes a context that is not running (suspended, or `interrupted` in Safari), so a gesture that was not a user activation or an iOS interruption does not leave music silent. A tick that falls behind `ctx.currentTime` skips the overdue steps instead of scheduling them in the past.

### 4. Who decides "wanted"

`applyPreferences` gains a third `$effect`: `deps.music.setWanted(preferences.music && preferences.sound && preferences.volume > 0)`. `ApplyDeps` gains `music: Pick<MusicPlayer, "setWanted">`, and `setupPreferences` passes the default `music`. Keeping the audibility rule in the preferences effect, not inside `configureSound`, keeps `configureSound` unchanged for its other users.

### 5. Root ownership

`+layout.svelte` calls `bindMusicLifecycle(document, music)` in a browser-only `$effect` that returns the cleanup. The root layout never unmounts on client navigation, so the loop keeps playing. Settings starts music at once because the switch's own `pointerdown` reaches the document listener before `onCheckedChange` sets the preference. Keyboard toggling works the same way through `keydown`.

- Rejected: owning the player in `settings.svelte` or per page. Navigation would stop or restart it.

### Trust boundary

No Convex code is touched. Music is client-only, per browser, and stored in `localStorage` like the other preferences. There is no authentication, room membership check, or server validation involved.

### Impact on callers

- `configureSound` callers: `applyPreferences` (tests pass a fake). The function moves to `graph.ts` and keeps its signature. Unaffected apart from the import path inside the sound leaf.
- `PreferencesStore` consumers: `settings.svelte` gains the switch (task group 4). `play.svelte` and `turn-alert.svelte.ts` read other fields and are unaffected because a new field changes nothing they read.
- `parsePreferences` users: `src/lib/utils/storage/index.ts` (re-export, no change) and `play.svelte` (reads `lastPlay`). Unaffected because the return type only gains a field.
- Sound module callers: `practice-board.svelte`, `checkers.svelte`, `tictactoe.svelte`, and `turn-alert.svelte.ts` call `playMoveSound`, `playCaptureSound`, `playTurnChime`, and `prepareSound`. Unaffected because the API is unchanged.
- Overlapping changes: `polish-new-game` and `add-product-pages` also edit `preferences.svelte.ts`. This change appends `music` after the existing fields in `Preferences`, `DEFAULT_PREFERENCES`, `parsePreferences`, the store, and `#write()`, and adds only ADDED requirements to `user-preferences`.

## Risks / Trade-offs

- [Autoplay policy blocks a context made before a gesture] → The context is only made inside `unlock()`/`setWanted(true)` after a gesture, and `getGraph` already calls `resume()`.
- [Timer throttling in background tabs causes gaps] → The scheduler pauses while hidden. The 150ms lookahead covers normal timer jitter.
- [Music masks the turn chime] → Level 0.2 and a lowpass keep it under the chime, which is unfiltered sine at a higher pitch.
- [Context state shared with game sounds] → The music gain is a separate node, so stopping music never touches master.
- [Node buildup over long sessions] → Every oscillator gets `stop(time)` and is released by the browser after it ends.

## Migration Plan

None. A missing `music` field parses to false. Rollback is a code revert, and a stored `music` key is ignored by older builds.
