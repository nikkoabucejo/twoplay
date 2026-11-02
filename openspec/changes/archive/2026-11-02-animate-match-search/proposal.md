# Proposal

## Why

After "Find match", the queue view is almost still: a small ping dot, a static timer box, and the slow neutral background. Searching should feel active and in motion.

## What Changes

- The queue card shows seat-colored motion while searching: a running comet ring around the card and a radar around the elapsed timer (ripples and the two seat colors orbiting).
- The ambient Mood background enters a searching state while queued: clouds drift faster and swell, and return to neutral when the search ends.
- Under reduced motion (OS setting or "Always reduce"), the queue view shows a still seat-tinted treatment and the background does not speed up.
- Out of scope: the match-found moment and redirect, copy changes, matchmaking logic, the "pending" spinner, and the friend-room waiting view.

## Capabilities

### New Capabilities

- `match-search-motion`: how the queue view and ambient background move while a quick-match search is running.

### Modified Capabilities

## Impact

- `src/lib/features/core/play/play.svelte`: queued view visuals; reports searching to Mood.
- `src/lib/features/presence/mood/`: `MoodPresence` gains a searching flag; `mood.svelte` reacts to it.
- `src/routes/layout.css`: possibly a running variant of the comet ring and radar keyframes.
- No Convex, schema, auth, or trust-boundary change. No new public Convex function.
