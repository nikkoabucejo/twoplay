## Context

- `Playing` (`src/lib/components/ui/playing/playing.svelte`) calls `room.abandon()` directly. Its `Room` already exposes `players`, `myIndex`, `game.round`, `activeSeat`, and `isWaitingForOpponent`.
- History renders rooms as `Tile`s with nested round rows. `splitHistory` (`history/rooms.ts`) separates the active room and any held rooms from the list. The rating cell prints `game.mmr > 0 ? "+" : "-"`, which turns a floor-clamped `mmr: 0` (`applyResult` in `convex/models/ratings/index.ts`) into "-0".
- `GameHistoryEntry` has `round`, `createdAt`, `result`, and `mmr`. `RoomHistoryEntry` adds `opponentName` and `type`. Change `fix-game-integrity` adds an optional `reason: "timeout" | "resign" | "abandon" | null` to each entry, and it may land after this change.
- Leaderboard is a card plus `<ul>`. Rows read `rowStats.data?.[id]?.totalGames ?? 0`, so they show zeros while stats load.
- `Page` already has a `sidebar` snippet: a grid `lg:grid-cols-[minmax(0,1fr)_18rem]` that stacks below `lg`. Its inner column has no `min-h-0`, so a `Feed` inside it grows instead of scrolling.
- No existing query lists other players' live games. `rooms.index.active` returns only the viewer's own room, which the Playing card already shows.
- There is no `AlertDialog` in `components/ui`. `Popover` (bits-ui) exists and is used by `Board`.

## Goals / Non-Goals

**Goals:** make the changes in specs/, edit only the owned files, add no Convex changes, and keep layout-shift at or below 0.01.

**Non-Goals:** a sidebar on Lobby or History, new `components/ui` primitives, any `Page` change beyond `min-h-0`, and changes to header, footer, play, or game rooms.

## Decisions

### 1. Abandon confirmation: `Popover` anchored to Abandon

- **Chosen:** wrap Abandon in `Popover` / `PopoverTrigger` / `PopoverContent`. The content holds the message, Cancel (`outline`), and Abandon (`destructive`). bits-ui moves focus into the content, closes on Escape or outside click, and returns focus to the trigger. The content is portalled, so opening it moves nothing.
- **Alternative: a new `components/ui/alert-dialog`.** This is the most correct semantics, but it adds a ui primitive outside this change's files.
- **Alternative: swap the card's buttons for an inline confirm row.** It changes the card's height. The card sits under the feed, so the feed would shrink while the user is acting.
- The text comes from a pure `abandonMessage({ round, opponentName, hasOpponent, isRoundLive })` in `playing/abandon.ts`. `isRoundLive` is `room.activeSeat !== null`, and `opponentName` is the first name of `room.players[1 - myIndex]`. The text always says "8": it is approved copy, and `RATING_STEP` is not exported from Convex.

### 2. History: flatten after `splitHistory`, then group by day

- `splitHistory` stays as it is and still splits rooms. A new `history/rounds.ts` adds:
  - `toRounds(rooms)`: one `{ code, type, opponentName, round, createdAt, result, mmr, reason }` per round, newest first. `reason` is read as `game.reason ?? null`, typed through a local `Partial<Pick<…>>`-style widening, so it compiles before and after change E lands.
  - `reasonLabel(reason)`: returns "Timeout", "Resigned", "Abandoned", or `null`.
  - `groupByDay(rounds, now)`: `[{ label, rounds }]` using local-day labels "Today", "Yesterday", "Oct 28", or "Oct 28, 2025".
  - `formatRatingChange(mmr)`: returns `"+8"`, `"−8"` (U+2212), `"0"`, or `null`.
- The list renders `groupByDay(toRounds(rooms.list))`. The held slot renders `toRounds(rooms.held)` with no day headings, so a room that finishes never inserts a heading above rows already shown.
- **Alternative: group rooms by day and keep room tiles.** This was rejected because the approved layout is one row per round.
- The rating column keeps its fixed `w-7` box and `invisible` when null, as it does now.

### 3. Leaderboard: one `<table>` at every width, with responsive cells

- Ranks 4 and up render in one `<table>`. The Games and Win rate cells are `hidden lg:table-cell`, and a `lg:hidden` caption under the name shows "N games · N% win" (or "—"). This keeps one accessible table and avoids duplicate DOM. Rendering a list and a table and toggling between them would put duplicate rows in the accessibility tree whenever the display toggle fails, and in jsdom.
- Podium: `splitPodium(entries)` returns `{ podium, rest }` from `leaderboard/standings.ts`. It reuses the existing `PODIUM_BADGE_CLASSES`.
- Pinned row: a `<tfoot>` with `sticky bottom-0` repeats the viewer's row. Its visibility comes from an `IntersectionObserver` attachment on the viewer's own `<tr>` (root: viewport, which accounts for the `Feed` clip). It toggles `invisible`, never mounts or unmounts, so it takes no layout space change. It renders only when the viewer is ranked and is not in the podium.
- `rankStatus({ rank, totalGames, listLength })` returns `"Rank #N of M"`, `"Not in the top M"`, or `"Finish a game to get ranked"`.
- Row stats: when `rowStats.isLoading` or the row is missing, show "—".

### 4. Sidebar through `Page`'s `sidebar`, composed in the route

- New components in the leaderboard leaf, exported from `leaderboard/index.ts` and `features/core/index.ts`:
  - `RatingSummary`: the existing rating card, moved out of `leaderboard.svelte`.
  - `RatingRules`: the static explanation.
- Only the Leaderboard route passes `{#snippet sidebar()}`, and only when signed in. Lobby and History have no sidebar (user decision): the list stays centered at `max-w-md` at every width. Leaderboard puts `RatingSummary` and `RatingRules` in the sidebar at every width and orders the aside first below `lg` (`max-lg:[&_aside]:order-first` on `Page`), so the summary stays above the list on phones.
- `convex-svelte` dedupes identical subscriptions, so `ratings.index.top` in both the sidebar and the page costs one subscription.
- **Alternative: each feature builds its own two-column grid.** This was rejected because it duplicates `Page`'s sidebar layout.
- `Page` (`src/lib/components/layout/page/page.svelte`) gets `min-h-0` on the sidebar grid and on the content column, so `Feed` scrolls inside it at `lg`. That is the only edit to `Page`.

### 5. Empty-state actions

`EmptyState` already has an `action` snippet. Each page passes two `Button href="/play"` links: Find match (default) and Open a room (outline). `/play` has no mode parameter and play is out of scope, so both go to `/play`.

## Risks / Trade-offs

- [The "8 rating points" copy is wrong for a player at the 100 floor] → accepted for now as approved copy. A follow-up can read `ratings.index.mine`.
- [A player with only draws has no rating row but has `totalGames > 0`, so they see "Not in the top M" while actually unranked] → rare, and fixing it needs a Convex shape change.
- [Popover semantics are `dialog`, not `alertdialog`] → acceptable for an anchored confirm. Revisit if an `AlertDialog` primitive lands.
- [Leaderboard aside ordered first on phones pushes the list down by the height of the rules panel] → keep `RatingRules` to a few `text-caption` lines.

## Open Questions

None. The orchestrator accepted the remaining assumptions.
