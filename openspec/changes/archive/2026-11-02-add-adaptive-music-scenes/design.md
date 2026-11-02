# Design

## Context

`MusicPlayer` in `src/lib/utils/sound/music.ts` runs a lookahead scheduler: a 25 ms timer schedules every step of the pure `notesForStep(step)` pattern whose time is before `ctx.currentTime + 0.15`, advancing `#step` and `#nextTime` (16th notes at 76 BPM, swing on odd steps). Every voice goes envelope → one lowpass `BiquadFilterNode` (1400 Hz) → music gain (`MUSIC_LEVEL` 0.2, 1.5 s fades) → master. The player is owned by `src/routes/+layout.svelte` through `bindMusicLifecycle`, and `applyPreferences` drives `setWanted`.

The same layout owns `MoodPresence` (`setupMood`). `Board` writes `mood.status` in an `$effect` (`board.svelte`, around line 377), and `play.svelte` sets `mood.searching` while `viewKind === "queued"`. `Board` already derives `result` from `resultView(...)` (`outcome.ts`), whose `tone` is `"win" | "loss" | "draw" | "neutral"` relative to `myIndex`. It is null while not live or viewing history, and `"neutral"` for spectators and closed rooms. It does not depend on `dismissedRound`, so it outlives a dismissed card.

## Goals / Non-Goals

**Goals:** one song that never restarts, with each scene a different arrangement of it (rhythm, tempo, swing, harmony, cutoff); a switch that lands on the next beat with no clicks, skipped steps, or doubled steps under rapid changes; a pure, testable note generator; no new timers, assets, or dependencies.

**Non-Goals:** a key change, a new melody, syncing scenes between players, stingers or one-shot jingles, any new preference.

## Decisions

### 1. Arrangements, not overlays

- Chosen: `notesForStep(step, scene = "default")` is pure and returns the notes that start on `step` in that scene's arrangement. Each scene has an entry in `SCENES`: `bpm`, `swing` (fraction of a step that odd steps lag), `cutoff`, `level`, and a `play` function that adds notes for one step of one bar. Every arrangement uses the loop's 8 bars and 4 chord slots, so a step number means the same place in the song in every scene.
- Rejected: gain buses that fade extra layers over an unchanged loop (the first version of this change). The groove never changed, so the scenes sounded like the same loop with something added on top.
- Rejected: a second scheduler per scene with a crossfade. Two schedulers double the oscillators during the fade and must stay sample-locked.

### 2. The arrangements

Note lengths are in 16th steps. Voices: `pad` (held chord), `stab` (short chord), `arp`, `bass`, `lead`, `bell` (sine), `hat` (noise).

| Scene     | BPM | Swing | Cutoff  | Level | Chords                       | Rhythm                                                                                                                                                                                                          |
| --------- | --- | ----- | ------- | ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| default   | 76  | 0.12  | 1400 Hz | 1     | Fmaj7, G6, Em7, Am7          | Today's loop: whole-bar pad, 8th arpeggio, root-fifth bass, sparse melody                                                                                                                                       |
| searching | 100 | 0     | 2800 Hz | 0.8   | Fmaj7, G6, Em7, Am7          | 16th arpeggio; pad as stabs plus a hat on steps 2, 6, 10, 14; bass 3-3-2 on steps 0, 3, 6, 8, 11, 14 (root, root, octave, root, root, fifth); lead plays the bar's first four melody notes on steps 0, 3, 6, 10 |
| win       | 90  | 0     | 3200 Hz | 0.85  | Fmaj7, G7, Cadd9, Am7        | Pad every half bar; arpeggio climbs the chord an octave up, then two; bass bounces root to octave in dotted 8ths; melody an octave up; a bell on steps 6 and 14                                                 |
| lose      | 62  | 0     | 650 Hz  | 1     | Fm6, G6, Ebmaj7, Am7         | Whole-bar pad and bass; quarter-note arpeggio falling through the chord; lead sighs down a step on steps 4 and 8                                                                                                |
| draw      | 76  | 0     | 1000 Hz | 1     | Fsus2, Gsus4, Em7sus4, Asus4 | Whole-bar pad; bass on beats 1 and 3; quarter-note arpeggio rising; lead repeats one chord tone on beats 2, 3, 4                                                                                                |

Win's chords each span less than an octave so the climbing arpeggio never repeats a pitch. Lose borrows iv and bIII from C minor. Draw's chords have no third. Arrangement levels are at most 1 and the music gain keeps `MUSIC_LEVEL`, so no scene changes the Volume rule.

The hat is an `AudioBufferSourceNode` on one shared 100 ms white-noise buffer. Each hit is 15 ms with a 1 ms attack, a 0.06 peak, and a 0.02 release, through a 7 kHz highpass (Q 0.7) straight into the music gain. It skips the lowpass, which would leave almost nothing of it, and stays under the music gain so fades and Volume apply.

### 3. Switching on the beat

`setScene` only records `#scene`. The scheduler keeps `#playing`, the arrangement it is scheduling. When it reaches a step on a beat (`step % 4 === 0`) and `#playing !== #scene`, it switches at that step's time `T`, before scheduling the step:

- The current arrangement's `GainNode` gets `setTargetAtTime(0, T, 0.05)`, and a new one at the scene's level takes its place. Every note goes envelope → arrangement gain → lowpass, so the previous arrangement's held notes release in about 0.15 s with no cancelled envelopes.
- `heldAt(step, scene)` returns the new arrangement's pad and bass notes that started earlier in the bar with a beat or more left, trimmed to what is left. They start at `T`, so a switch mid-bar does not leave a gap until the next bar.
- The cutoff runs `cancelScheduledValues(now)`, `setValueAtTime(value, now)`, `setValueAtTime(value, T)`, and `exponentialRampToValueAtTime(cutoff, T + 0.4)`, so a change during another sweep continues from what is sounding.
- `T` comes from `#nextTime`, so it is on the step grid and after every note already scheduled. With a 150 ms lookahead, the switch is heard within one beat of the call.
- Rejected: switching on the next bar. Up to 3 s at 62 BPM feels late.
- Rejected: `cancelAndHoldAtTime`. Firefox lacks it.

### 4. Tempo glide

The step length is `stepSeconds(#bpm)`. A switch sets `#tempoStep = (target - #bpm) / 8`. Each step advances `#nextTime` by the current step length, then moves `#bpm` one `#tempoStep` toward the target, clamped. The tempo reaches the target 8 steps (2 beats) after the boundary, the step counter never jumps, and a new switch mid-glide starts from the current BPM. The scheduler carries note lengths in steps, and `#play` converts them to seconds by summing the step lengths ahead along the glide (from the current `#bpm`, with `#advance`'s `#tempoStep` and clamp), so a note ends on the step it reaches even while the tempo moves. Swing is `swing × stepSeconds(#bpm)` on odd steps of the playing arrangement, and boundaries are on even steps, so a swing change never reorders notes. Overdue steps after a throttled tick are skipped one `#advance` at a time.

### 5. Paused, off, or not connected

`setScene` never calls `getGraph`. `#connect` creates the lowpass at the scene's cutoff, the first arrangement gain, the hat highpass, and the noise buffer. `#start` sets the recorded scene with `setValueAtTime(…, now)` (cutoff and arrangement level), sets `#playing`, the BPM, and no glide, before the 1.5 s fade-in. A resumed tab comes back in the right arrangement and tempo without a sweep.

### 6. Scene selection

- `export type MusicScene = "default" | "searching" | "win" | "lose" | "draw"` and a pure `musicSceneOf({ outcome, searching }: { outcome: "win" | "loss" | "draw" | null; searching: boolean }): MusicScene` live in `music.ts`, exported from the `$lib/utils/sound` barrel. Precedence is outcome, then searching, then default.
  - Chosen over placing it in `features/presence`: the input is a structural type, so `utils/sound` never imports a feature, and `MoodPresence` satisfies it as is.
- `MoodPresence` gains `outcome = $state<Exclude<ResultView["tone"], "neutral"> | null>(null)`, with `ResultView` imported as a type from `$lib/components/layout` beside `BoardStatus`.
- `outcome.ts` gains a pure `moodOutcome(result: ResultView | null)`, which returns `result.tone` unless the result is null or neutral. `board.svelte` adds a second `$effect`, separate from the `status` one: `mood.outcome = moodOutcome(result)`, with a cleanup that sets it to null. `result` ignores `dismissedRound`, so the scene outlives a dismissed card. It goes null when the next round starts (status is no longer winner or draw) or when the viewer opens history.
- `+layout.svelte` adds `$effect(() => music.setScene(musicSceneOf(mood)))` next to `bindMusicLifecycle`.
- The `Mood` background component does not read `outcome`. Its visuals are unchanged.

### 7. Ordering with `add-ui-click-sounds`

`add-ui-click-sounds` is applied first. Both changes edit `src/routes/+layout.svelte` and `src/lib/utils/sound/index.ts`. This change re-reads both files when applying and only adds lines: one `$effect` after the `bindMusicLifecycle` effect in the layout, and `musicSceneOf` and `type MusicScene` on the barrel's `./music.js` export line. It does not move or rename anything that change adds. If that change adds its own nodes in `music.ts` or `graph.ts`, the arrangement gains stay inside the music lowpass and the hat highpass feeds the music gain, so neither touches master.

### Trust boundary

No Convex code is touched. The scene is derived on the client from data the viewer already receives (`status`, `myIndex`, and the queue state) and only changes local audio. There is no authentication, room-membership check, or server validation involved, and a wrong scene has no effect on game state.

### Impact on callers

- `MusicPlayer` callers. `src/lib/utils/sound/index.ts` gains exports (task 1.7). `applyPreferences` and `setupPreferences` in `src/lib/utils/storage/preferences/preferences.svelte.ts` use `Pick<MusicPlayer, "setWanted">` and are unaffected because `setWanted` is unchanged. `+layout.svelte` gains the scene effect (task 3.1). `bindMusicLifecycle` is unchanged.
- `notesForStep` gains an optional `scene` that defaults to `"default"`, so its existing tests and callers are unchanged. The `Note["voice"]` union widens with `stab`, `bell`, and `hat`, and the `VOICES` table gains entries. `stepSeconds` and `heldAt` are new exports of `music.ts`, not of the barrel.
- `MoodPresence`, `setupMood`, and `getMood`. `mood.svelte.ts` gains `outcome` (task 2.2). `board.svelte` publishes it (task 2.4). `play.svelte` is unaffected because it writes only `searching`. `presence/index.ts` and `mood/index.ts` re-export the class unchanged. `play.svelte.test.ts` and `mood.svelte.test.ts` construct `MoodPresence` and are unaffected because the new field defaults to null. `mood.svelte` does not read it. `board.svelte.test.ts` gains a `getMood` mock for the new tests (task 2.3), and existing tests are unaffected because `getMood()` returning undefined keeps the effect a no-op.
- `resultView` is read only. Its tests are unchanged.

## Risks / Trade-offs

- [Clicks on a switch] → Every note envelope starts at 0, the old arrangement releases with `setTargetAtTime` from its current value, and the cutoff ramps from its sounding value.
- [Muddy overlap of two arrangements] → The old arrangement's gain releases with a 0.05 s time constant at the boundary, and only pad and bass are picked up mid-bar.
- [Tempo glide sounds like a mistake] → It lasts 2 beats and is linear in BPM, so it reads as a push or a drag rather than a jump.
- [Searching and win are louder than default] → Their arrangement levels are 0.8 and 0.85. Checked by ear in live QA. The music gain target is unchanged.
- [One gain node per switch] → Each old arrangement gain is disconnected 0.5 s (ten time constants) after its boundary, by a timer from the injected `setTimer`. When the music halts, pending timers are cleared and their gains disconnected at once, since the music gain is already at 0.
- [Old board cleanup races a new board's write on room change] → Each board writes `outcome` from its own effect, and Svelte runs the old component's teardown before the new one's effects, so the new value wins. Task 2.3 tests the unmount cleanup.

## Migration Plan

None. No stored data changes. Rollback is a code revert.
