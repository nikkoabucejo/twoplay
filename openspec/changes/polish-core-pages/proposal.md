## Why

Lobby, History, and Leaderboard are working lists without next steps or explanations. Abandon has no confirmation, the empty states don't point anywhere, history shows "-0" and repeats "View" labels, the leaderboard shows "0 games · 0% win" before stats load, and ratings are never explained. This change is UI polish only and stays in the polish lane.

## What Changes

- Playing card: Abandon opens a confirmation that names the cost, for example "You'll forfeit round 2 to Bob and lose 8 rating points. The room closes." The confirm button uses the destructive variant.
- Empty states on Lobby ("No open rooms right now"), History, and Leaderboard offer Find match and Open a room.
- History: one row per round, grouped by day, with a W/L/D badge, the end reason when the entry carries one, and the rating change. Copy changes: "Waiting for an opponent", "Replay" instead of View, and a unique accessible name per Replay link. A zero change shows as "0", never "-0". The held-slot behavior (`splitHistory`) stays.
- Leaderboard: a podium for the top 3, a table at `lg` (list below `lg`), your own row pinned when it is off-screen, "—" until row stats load, "Finish a game to get ranked" when you are unranked, and a short "How ratings work" panel.
- A sidebar on Leaderboard, using the existing `Page` `sidebar` snippet: your rating summary and how ratings work. Lobby and History have no sidebar; their list stays centered at every width.
- Out of scope (deferred): public signed-out reads, lobby filters, history stats and filters, spectating, and any Convex change.

## Capabilities

### New Capabilities

- `playing-card`: the viewer's live-room card on Lobby and History, including Abandon confirmation.
- `game-history`: how `/history` lists the viewer's rounds.
- `leaderboard`: how `/leaderboard` ranks players and explains ratings.
- `core-pages`: what Lobby, History, and Leaderboard share: empty states with next steps, and the Leaderboard sidebar.

### Modified Capabilities

None. `page-layout` already allows an optional empty-state action and a `Page` sidebar. This change uses both without changing those requirements.

## Impact

- Code: `src/lib/features/core/{lobby,history,leaderboard}/*`, `src/routes/{lobby,history,leaderboard}/+page.svelte`, `src/lib/components/ui/playing/*`. The new sidebar pieces (`RatingSummary`, `RatingRules`) live in the leaderboard leaf. Exporting them takes one line in `src/lib/features/core/index.ts`.
- Convex: none. This change reads only existing queries (`rooms.index.{history,stats,statsForUsers,lobbies,active,get}`, `ratings.index.{mine,top}`) and the existing `rooms.index.abandon` mutation. No schema, auth, or trust-boundary change, and no new public function.
- `src/lib/components/layout/page/page.svelte`: adds `min-h-0` to the sidebar grid and the content column, nothing else.
- Reads the optional `reason` field that change `fix-game-integrity` adds to history entries. History renders correctly whether or not that field is present.
- Not touched: `features/core/play`, header, footer, game rooms.
