# Tasks

No server work: this change touches no file under `convex/`.

## 1. Music module [engineer]

- [x] 1.1 [engineer] Move `SoundGraph`, `audio`, `settings`, `getGraph`, `getAudibleGraph`, and `configureSound` unchanged from `src/lib/utils/sound/index.ts` to a new `src/lib/utils/sound/graph.ts`. Have `index.ts` import from `./graph.js` and keep exporting `configureSound`. Verify: the existing `src/lib/utils/sound/index.test.ts` passes untouched.
- [x] 1.2 [engineer] Write `src/lib/utils/sound/music.test.ts` for `notesForStep` first: "Chord loop" (bars 0–7 are Fmaj7, Em7, Dm7, Cmaj7 twice, and bar 8 equals bar 0), "Bass on the root" (step 0 of every bar has a bass note at that bar's root), "Sparse melody" (fewer than 8 of 16 steps carry a lead note, each in C major, with tones outside the bar's chord at most two steps long), and "Loop seam" (the last bar's lead and bass run up to the loop's restart). These tests fail first.
- [x] 1.3 [engineer] Implement `notesForStep(step)` and the `Note` type in `music.ts` (76 BPM, 16 steps per bar, 8-bar form, deterministic lead table, triangle bass with a turnaround in the last bar). Verify: 1.2 passes.
- [x] 1.4 [engineer] Add `MusicPlayer` tests to `music.test.ts` with a fake `AudioContext` (as in `index.test.ts`, plus `createBiquadFilter`) and fake timers: "Muted page creates no audio context" (`getGraph` is not called while not wanted or before `unlock`), "No gesture, no music", "First gesture starts music", "Turning music on starts it" (`unlock` then `setWanted(true)`), "Sound off silences music" (`setWanted(false)` ramps the music gain to 0 and stops ticking), "Fade in" / "Fade out" (ramps target 0.2 and 0 over about 1.5s), "Tab hidden" / "Tab visible again" (`setHidden`), "Music routing" (every voice goes through the lowpass and the music gain, which feeds master and targets 0.2), "Pad crossfade" (each chord is at full level just before the next bar, and the pad never dips at a bar change), and scheduling only within 150ms of `currentTime`. These tests fail first.
- [x] 1.5 [engineer] Implement `MusicPlayer` (deps `getGraph`, `setTimer`, `clearTimer`; methods `setWanted`, `unlock`, `setHidden`; lowpass → music gain → master; 25ms tick, 150ms lookahead; step counter survives pause) and the default `music` instance in `music.ts`. Verify: 1.4 passes.
- [x] 1.6 [engineer] Add tests for `bindMusicLifecycle` with a fake `EventTarget`: every `pointerdown`, `pointerup`, or `keydown` calls `unlock`, `visibilitychange` passes `hidden` to `setHidden`, and the cleanup removes all listeners. These tests fail first. Then implement it in `music.ts`, and export only `bindMusicLifecycle`, `music`, and `type MusicPlayer` by name from `src/lib/utils/sound/index.ts`. Verify: tests pass.

## 2. Preference and wiring [engineer]

- [x] 2.1 [engineer] In `src/lib/utils/storage/preferences/preferences.svelte.test.ts`, write tests for "Music defaults off", "Music choice survives reload", "Invalid music value ignored", and "Music change keeps other fields". Add an `applyPreferences` test with a fake `music` dep: `setWanted` gets true only when `music`, `sound`, and `volume > 0` all hold, and false after sound turns off or volume goes to 0. These tests fail first.
- [x] 2.2 [engineer] In `preferences.svelte.ts`, append `music` to `Preferences`, `DEFAULT_PREFERENCES` (false), `parsePreferences` (boolean, else default), the store's `$state`, the constructor, and `#write()`, and add `setMusic`. Add `music: Pick<MusicPlayer, "setWanted">` to `ApplyDeps`, widen the `applyPreferences` input to include `music`, and add the `setWanted` `$effect`. Pass `music` from `$lib/utils/sound` in `setupPreferences`. Verify: 2.1 passes and the existing preference tests still pass.
- [x] 2.3 [engineer] In `src/routes/+layout.svelte`, add a browser-only `$effect` that returns `bindMusicLifecycle(document, music)`. Verify: `pnpm check` reports 0 errors, and a scripted SSR render (`pnpm build`) does not touch `AudioContext`.

## 3. Settings row [designer]

- [x] 3.1 [designer] In `src/lib/features/core/settings/settings.svelte.test.ts`, write the "Switch toggles the preference" test (clicking the "Background music" switch sets `music` to true and shows it checked) and the "Sound description" test (the Sound row text mentions music). These tests fail first.
- [x] 3.2 [designer] In `settings.svelte`, add a "Background music" row after the Volume row, using the `row` snippet and `Switch` (`id="music"`, `checked={preferences.music}`, `onCheckedChange={(value) => preferences.setMusic(value)}`), with the description "A quiet retro loop while you play." Change the Sound row description to "Move, capture, turn sounds, and music." Verify: 3.1 passes.

## 4. Verification

- [x] 4.1 `pnpm test`
- [x] 4.2 `pnpm check` (0 errors, 0 warnings)
- [x] 4.3 `pnpm format:check`
- [x] 4.4 `pnpm build`
- [x] 4.5 Live QA in browser-a:
  - With default preferences, no music plays.
  - Turning on Background music starts it with a fade in.
  - Going from Home to Settings to /play keeps the loop going without restarting.
  - Sound off and volume 0 each fade it out.
  - Switching tabs pauses it, and coming back resumes it.
  - After a reload with music on, it starts only after the first click or key press.
  - A move sound and the turn chime are still clearly audible over the music.
  - In browser-b, with sound off and music on, clicking around creates no `AudioContext` (DevTools, WebAudio panel).
