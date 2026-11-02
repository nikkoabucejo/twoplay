# Proposal

## Why

/play is the main way into a game, but it hides its state. The game picker is a five-icon carousel that repeats two games. The opponent tabs use internal terms (Matchmaking, Public, Private). After Create room the page shows only a code. The queue view is padded with a `py-13.25` hack and has no timer. Start buttons give no pending feedback. An active game redirects you without asking. Nothing is remembered between visits.

## What Changes

- Two game cards in a radiogroup with arrow-key, Home, and End navigation replace the carousel. `?game=X` preselects a card (the landing page links here).
- The opponent choice reads "Anyone · A friend · Open room", with a one-line hint under the selected choice. Anyone queues for matchmaking, A friend creates a private room, and Open room creates a public room.
- Find match and Create room show a spinner and "Finding…" / "Creating…" while the call is in flight. The button keeps its width.
- Waiting room after Create room: "Waiting for your opponent…" with a Beacon, the room code, Copy link (existing toast), Share via `navigator.share` where it exists, and Cancel room (abandons the room). It stays until the opponent joins, then the page opens the room. Reloading /play while the room waits shows the waiting room again.
- Matchmaking queue view: a spinner, an mm:ss elapsed timer, "Play a friend instead", and Cancel. Leaving /play while queued cancels the queue entry (component teardown and `pagehide`). The `py-13.25` hack goes.
- An active game found on load is no longer a silent redirect. The shared `Playing` card shows instead, used as it is. Its Resume label and Abandon confirmation come from change C (polish-core-pages), which owns `components/ui/playing`. Redirects still happen when this page's own queue or room produces the match.
- The last game, opponent, and clock are remembered in the preferences store and preselected next visit. `?game=` wins over the stored game.
- From `lg`, game cards sit on the left and opponent, clock, and start on the right, using the `Page` sidebar.

Later changes, folded into this delta: the two-column `lg` layout became one centered card (task 3.7); game cards became the `Choices` radiogroup in `choices.svelte` (no `game-cards.svelte`); every opponent choice shows its hint; the queue view shows a Beacon and radar instead of a spinner; the game and setup choices share one area with the status views and are hidden during search, waiting, and playing, at a fixed card height; signed-out visitors see the in-page `Gate` (ui/gate) Sign in, and the header hides its own Sign in on gated routes (`isGatedRoute`).

Out of scope:

- Any Convex change. `rooms.create`, `rooms.abandon`, `rooms.active`, `rooms.get`, `pairings.enqueue/cancel/status` are used as they are. The server half of B5 (queue cleanup) belongs to change E.
- A server-side queue start time. The timer counts from when this page saw the entry.
- The settings page that edits preferences (change D).

## Capabilities

### New Capabilities

- `play-setup`: The /play page. Covers game and opponent selection, pending start states, the waiting room, the matchmaking queue view, the active-game card, and the desktop layout.

### Modified Capabilities

- `user-preferences`: adds the remembered last game, opponent, and clock, and requires a write of one field to keep the other stored fields.

## Impact

- Code: `src/lib/features/core/play/` (`play.svelte`, `active-room.ts`, `copy-link.ts`, new `elapsed.ts` and `game-cards.svelte`), `src/routes/play/+page.svelte`, and `src/lib/utils/storage/preferences/` (`preferences.svelte.ts`, `index.ts`). This change makes the first prefs edit, and change D appends its settings fields on top of it. `components/ui/playing` is not touched.
- Tests: `play.svelte.test.ts`, `active-room.test.ts`, `copy-link.test.ts`, `elapsed.test.ts`, `preferences.svelte.test.ts`.
- Trust boundary: unchanged. No schema change and no new public Convex function. The client calls existing authenticated mutations, which re-check the caller and seat as they do now.
