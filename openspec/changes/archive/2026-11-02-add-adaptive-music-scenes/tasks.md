# Tasks

No server work: this change touches no file under `convex/`. Apply after `add-ui-click-sounds`. Re-read `src/routes/+layout.svelte` and `src/lib/utils/sound/index.ts` before editing them.

## 1. Scene engine [engineer] (parallel-safe with 2)

- [x] 1.1 [engineer] In `src/lib/utils/sound/music.test.ts`, add a `musicSceneOf` describe: win, loss, and draw outcomes map to `"win"`, `"lose"`, and `"draw"`; `searching: true` with no outcome gives `"searching"`; an outcome with `searching: true` gives the outcome's scene ("Result over searching"); neither gives `"default"`. These tests fail first.
- [x] 1.2 [engineer] In `src/lib/utils/sound/music.ts`, add `type MusicScene` and the pure `musicSceneOf({ outcome, searching })`. Verify: 1.1 passes.
- [x] 1.3 [engineer] In `src/lib/utils/sound/music.test.ts`, add arrangement tests to the `notesForStep` describe, plus `stepSeconds` and `heldAt` describes, which fail first: every scene repeats bar 0 at bar 8; "Searching drives" (an arpeggio note on every step lasting one step at 100 BPM, stabs and hats on steps 2, 6, 10, 14 and no held pad, bass on steps 0, 3, 6, 8, 11, 14 starting on the root, a lead riff of the bar's first four melody pitches); "Win lifts" (Cadd9 in bars 2 and 6, the default melody an octave up on the same steps, a strictly rising arpeggio, an octave-bouncing bass, bells); "Lose deflates" (Fm6 in bar 0 and Ebmaj7 in bar 2, fewer notes than default, one whole-bar bass at 62 BPM, falling quarter-note arpeggio and lead); "Draw hovers" (no third above the root in any chord, quarter-note arpeggio, bass on steps 0 and 8, one repeated lead pitch). The existing default `notesForStep` tests stay unchanged.
- [x] 1.4 [engineer] In `music.ts`, replace the overlay layers with arrangements: `stepSeconds(bpm)`, a `SCENES` table (`bpm`, `swing`, `cutoff`, `level`, `play`), `notesForStep(step, scene = "default")`, and `heldAt(step, scene)`. `Note["voice"]` is `pad | stab | arp | bass | lead | bell | hat`. Verify: 1.3 passes, and the default `notesForStep` tests still pass.
- [x] 1.5 [engineer] In `music.test.ts`, replace the bus-based `setScene` tests with arrangement tests, which fail first:
  - "Default is unchanged": 1400 Hz, no hats, and no stab or bell oscillators.
  - "Change lands on the next beat": the switch time is on the step grid at a multiple of 4 steps, after the call, and within one beat plus the 150 ms lookahead.
  - "Crossfade": per scene, the cutoff ramps exponentially to 2800, 3200, 650, or 1000 Hz, ending 0.4 s after the boundary.
  - "Arrangement switch": the beat before the boundary plays default's notes, and the beat from it plays searching's notes plus `heldAt`.
  - "Lose enters mid-bar": the Fm6 pad and the bass start at the boundary.
  - "Previous arrangement releases": every note started before the boundary fades out from it through its arrangement gain, and no later note does.
  - "Tempo glide": 76 to 100 BPM over 8 steps with non-increasing step lengths, and each step after the boundary plays the next searching step once.
  - "Scene tempos": 100, 90, 62, and 76 BPM once the glide ends.
  - "Searching hats": a 7 kHz, Q 0.7 highpass feeds only the music gain, the hats never reach the lowpass, and each hit ramps from 0 to 0.06 in 1 ms.
  - "Rapid changes": the cutoff runs cancel, hold, hold, ramp from the sounding value; every envelope starts at 0; no step plays twice; the last scene wins.
  - "Scenes stay under game sounds", "Music off", and "Hidden tab" (resumes in the win arrangement and tempo with `cancel`, `set` on the cutoff and no sweep).
- [x] 1.6 [engineer] In `music.ts`, implement the switch in `MusicPlayer`: `setScene` records the scene; `#tick` switches on the next beat step through `#switch` (old arrangement gain released, new gain at the scene level, `heldAt` notes, cutoff hold and ramp, tempo glide); `#advance` moves the step and the glide; `#swing` follows the playing arrangement; `#play` routes notes to the arrangement gain or, for the hat, the highpass; `#holdScene` applies the scene and tempo at once on start. Remove the buses, `layersForStep`, and `#sceneEnd`. Verify: 1.5 passes, and all existing `MusicPlayer` tests still pass.
- [x] 1.7 [engineer] In `src/lib/utils/sound/index.ts`, add `musicSceneOf` and `type MusicScene` to the `./music.js` export line, keeping whatever `add-ui-click-sounds` added. Verify: `pnpm check` reports 0 errors.

## 2. Mood outcome [engineer] (parallel-safe with 1)

- [x] 2.1 [engineer] In `src/lib/components/layout/board/outcome.test.ts`, add a `moodOutcome` describe: null gives null, `"neutral"` gives null (spectator or closed room), and `"win"`, `"loss"`, and `"draw"` pass through. These tests fail first. Then add `moodOutcome(result: ResultView | null)` to `src/lib/components/layout/board/outcome.ts`. Verify: tests pass.
- [x] 2.2 [engineer] In `src/lib/features/presence/mood/mood.svelte.ts`, add `outcome = $state<Exclude<ResultView["tone"], "neutral"> | null>(null)` to `MoodPresence` (type import from `$lib/components/layout`). Verify: `pnpm check` reports 0 errors, and `mood.svelte.test.ts` and `play.svelte.test.ts` pass unchanged.
- [x] 2.3 [engineer] In `src/lib/components/layout/board/board.svelte.test.ts`, add a hoisted `getMood` mock on `$lib/features/presence` (as in `play.svelte.test.ts`) and tests, which fail first:
  - "Win, lose, and draw": with a live footer and a winner status, `mood.outcome` is `"win"` for the winning `myIndex` and `"loss"` for the other. A draw status gives `"draw"`.
  - "Spectator and closed room": `myIndex: null` with a winner, or `footer.roomClosed`, gives null.
  - "Result card dismissed": after the card's "View board" action, `mood.outcome` is unchanged.
  - "Next round or leaving": rerendering with a turn status, and unmounting, each set `mood.outcome` to null.
  - Existing tests without the mock stay unaffected.
- [x] 2.4 [engineer] In `src/lib/components/layout/board/board.svelte`, add an `$effect` after the `mood.status` one that sets `mood.outcome = moodOutcome(result ?? null)` and resets it to null in the cleanup. Verify: 2.3 passes.

## 3. Wiring [engineer]

- [x] 3.1 [engineer] In `src/routes/+layout.svelte`, import `musicSceneOf` from `$lib/utils/sound` and add `$effect(() => music.setScene(musicSceneOf(mood)))` after the `bindMusicLifecycle` effect, keeping the `add-ui-click-sounds` edits. "Searching for a match" and "Match found" are covered by `play.svelte`'s existing `mood.searching` effect, `musicSceneOf` (1.1), and live QA. Verify: `pnpm check` reports 0 errors, and `pnpm build` passes (SSR does not run the effect).

## 4. Verification

- [x] 4.1 `pnpm test`
- [x] 4.2 `pnpm check` (0 errors, 0 warnings)
- [x] 4.3 `pnpm format:check`
- [x] 4.4 `pnpm build`
- [x] 4.5 Live QA in browser-a and browser-b, with Sound and Background music on in both: (searching verified live in browser-a; win, lose, draw, View board, rematch, leave, and hidden-tab resume verified live in browser-c and browser-d)
  - Quick match from /play in both. While queued, the music speeds up and drives: 16th arpeggio, pumping bass, offbeat stabs and hi-hat. When matched, it eases back to the default groove within about a beat, without restarting.
  - Finish a round. The winner's browser bounces brighter with a climbing arpeggio and bells; the loser's slows down into minor chords with long bass notes. Dismiss the card with "View board", and the scene holds.
  - Play a drawn round, if the game allows one (tic-tac-toe). Both browsers switch to suspended chords in even quarter notes.
  - Rematch. Both return to default when the next round starts.
  - Leave the room after a finished round. The music returns to default.
  - Hide the tab during a round end, then return. The music resumes in that round's scene.
  - Scene changes have no clicks or volume jumps, and the turn chime and move sounds stay clearly above the music in every scene.
