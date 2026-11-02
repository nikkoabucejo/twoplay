# Design

## Context

See proposal.md. The queue view renders in the same grid cell as the always-laid-out setup controls (`play.svelte` `queued()`), so the card size is fixed. `Mood` is mounted once in `src/routes/+layout.svelte` and reads `MoodPresence.status` (a `BoardStatus`) written by Board. On /play the status is null, which is the neutral state. `layout.css` already has `comet-ring` (seat-tinted border plus spark, with a still fallback under reduced motion) and the `motion-safe` and `motion-reduce` variants that honor `.reduce-motion`.

## Goals / Non-Goals

**Goals:** lively seat-colored motion in the card and background while `viewKind === "queued"`. It must stay cheap on mobile.

**Non-Goals:** new copy, match-found animation, changes to Beacon (shared), changes to `BoardStatus`.

## Decisions

- **Searching is a separate flag on `MoodPresence`** (`searching = $state(false)`), not a new `BoardStatus` variant. `BoardStatus` is the board's game status, used by strips and other components; searching is not a board state. Mood treats `searching` as an override only when `status` is null. The play page sets it from an `$effect` keyed on `viewKind === "queued"` and resets it to false in the cleanup, so unmount and view changes always restore the neutral state.
- **Background searching state**: every cloud keyframe animation runs at playback rate 3 via `updatePlaybackRate`, which avoids the jump that changing `animation-duration` causes. The seats also take turns leading every 1.4s, the length of the existing swell transition. The lead seat goes to scale 1.4 and opacity 1, the other to 0.8 and 0.7, so pink swells as cyan shrinks and then they swap. The swap skips under OS reduced motion and `.reduce-motion`.
- **Card ring**: reuse the `comet-ring` layers, shown and running while queued, with a faster spin than `selected-ring`. Its reduced-motion fallback (a still gradient) comes for free.
- **Timer radar**: absolute, `aria-hidden` overlays inside the timer box. There are two expanding ripple rings (scale and opacity) and two seat-colored dots orbiting via `rotate` on a wrapper. All of it is behind `motion-safe:`. Under `motion-reduce`, the dots sit still at opposite sides. The box stays `h-20 w-full`, so the size is unchanged.
- Alternative considered: the Mood clouds pull toward the center via translate. Rejected: drift layers already own `translate`, and changing it fights the keyframes.

## Risks / Trade-offs

- [Mood already runs ~25 blurred blobs] → no new blurred layers in the background. The card's radar animates transform and opacity only; the ring reuses `comet-ring` (a conic-gradient repaint plus its one static blurred glow).
- [OS reduced motion] → the cloud scale/opacity transition sits behind `motion-safe`, so the searching swell does not ease under reduced motion.
- [Shared `MoodPresence`] → additive field defaulting to false; Board and games are unaffected.
- [Impact callers] `setupMood`/`getMood` callers (`+layout.svelte`, `board.svelte`, `tictactoe.svelte`, `checkers.svelte`) are unaffected because they never read or write `searching`. `playView` is unchanged. `Beacon` is unchanged.
- [Concurrent polish-new-game edits in play.svelte] → keep the diff confined to the `queued()` snippet and one effect.
