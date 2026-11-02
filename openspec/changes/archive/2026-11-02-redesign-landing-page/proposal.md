# Proposal

## Why

The landing page is a wordmark, two icons, and a Sign in button. It doesn't say what twoplay is or how to start, and signed-in users get the same page with nothing for them: no way back into a live game, and the game is picked on `/` and then again on `/play`.

## What Changes

- Signed-out visitors get a marketing landing: a hero with the pitch and two actions, "Quick match" and "Play a friend", both opening sign-in; game cards; and "How it works" in three steps.
- Signed-in users get a home view: a "Resume your game" banner when they have an active room, in the same slot that otherwise holds the two actions (linking to `/play`), and the same game cards.
- Game cards are always shown. Each has the game's name, a one-line description, and a small static board preview, and links to `/play?game=<type>`, which `/play` already reads to preselect the game.
- `GameMeta` in `src/lib/features/play/games.ts` gains a one-line `description` per game.
- From `lg`, the pitch sits on the left and the game cards on the right. Below `lg` they stack.
- Out of scope: live room counts, the top-5 leaderboard strip, any change to `/play`, the header, footer, dock, lobby, history, or leaderboard, and any Convex change.

## Capabilities

### New Capabilities

- `landing-page`: what `/` shows to signed-out visitors and signed-in users: hero and actions, game cards, how it works, and the resume banner.

### Modified Capabilities

None. `search-indexing` ("Crawlable landing content"), `site-metadata`, `layout-stability` ("Stable page load" for `/`), and `ui-accessibility` ("Reduced motion" for the wordmark) keep their requirements, and this change must keep satisfying them.

## Later Changes

- The hero's "Quick match", "Play a friend", and "Resume your game" were removed; the game cards start a game, and the root layout's live-game link (`liveGameHref`) leads back to an active room.
- The Resume requirement and the action-slot design (design.md decision 2) no longer apply; `/` does not read `rooms.index.active`.

## Impact

- `src/routes/(games)/+page.svelte` and `src/routes/(games)/page.svelte.test.ts`: rewritten.
- New `src/lib/features/core/home/` leaf (`Home` plus card, preview, and resume pieces) exported from `src/lib/features/core/index.ts`.
- `src/lib/features/play/games.ts`: `description` added to `GameMeta` and to each `GAMES` entry.
- Reads the existing `api.models.rooms.index.active` query (authenticated with `requireUser`, returns only the caller's own room). No schema change, no new Convex function, no trust-boundary change.
