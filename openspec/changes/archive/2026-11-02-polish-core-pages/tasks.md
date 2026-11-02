## 1. Playing card (parallel-safe)

- [x] 1.1 [engineer] Add `abandonMessage` in `src/lib/components/ui/playing/abandon.ts`. Write its tests first in `abandon.test.ts`, covering the three "Confirmation names the cost" scenarios. Verify with `pnpm test`.
- [x] 1.2 [engineer] Write the confirm-flow tests first in `playing.svelte.test.ts`: Cancel leaves `rooms.index.abandon` uncalled, confirm calls it once with the room code, a rejection still shows the server message, and the empty seat label reads "Waiting for an opponent". Then wrap Abandon in `Popover` in `playing.svelte`, with Cancel (`outline`) and Abandon (`destructive`) and the message from 1.1. Verify with `pnpm test`.
- [x] 1.3 [designer] Style the confirmation in `playing.svelte`: `text-caption` copy, `whitespace-nowrap` buttons, focus returning to Abandon. Check live that opening the popover moves nothing.

## 2. History (parallel-safe)

- [x] 2.1 [engineer] Add `toRounds` (carrying `reason ?? null`), `reasonLabel`, `groupByDay(rounds, now)`, and `formatRatingChange` in `src/lib/features/core/history/rounds.ts`. Write their tests first in `rounds.test.ts`: day labels Today, Yesterday, "Oct 28", and a date with the year; newest first; `0` gives "0"; `-8` gives "−8"; `null` gives `null`; an entry without `reason` gives `reason: null`; each reason label. Leave `splitHistory` and `rooms.test.ts` unchanged. Verify with `pnpm test`.
- [x] 2.2 [engineer] Update `history.svelte.test.ts` first: rows per round under day headings, "Waiting for an opponent", Replay links with unique names and `/<type>/<code>/<round>` hrefs, "Timeout" shown for a `reason: "timeout"` entry and no reason text for an entry without the field, empty-state Find match and Open a room links, and the existing held-slot and Playing-card tests kept and adapted to round rows. Then rework `history.svelte` to render `groupByDay(toRounds(rooms.list))` and `toRounds(rooms.held)` in the held slot. Verify with `pnpm test`.
- [x] 2.3 [designer] Build the round row and day heading markup in `history.svelte`: W/L/D badge with sr-only full word, the reason as `text-caption` after the badge, a fixed-width rating cell, `whitespace-nowrap` labels, and a `FeedSkeleton` that matches the row box. Add the empty-state `action` snippet with two `Button href="/play"` links.

## 3. Leaderboard

- [x] 3.1 [engineer] Add `splitPodium` and `rankStatus` in `src/lib/features/core/leaderboard/standings.ts`. Write their tests first in `standings.test.ts`, covering five players, one player, ranked, "Not in the top M", and "Finish a game to get ranked". Verify with `pnpm test`.
- [x] 3.2 [engineer] Update `leaderboard.svelte.test.ts` first: "—" while `statsForUsers` loads, the podium with the rest in a table with Rank/Player/Games/Win rate/Rating headers, a pinned row that shows when the own row isn't intersecting (stub `IntersectionObserver`) and hides when it is, and empty-state links. Then implement the table, the `<tfoot>` sticky pinned row, and the observer attachment in `leaderboard.svelte`. Verify with `pnpm test`.
- [x] 3.3 [designer] Podium markup in `leaderboard.svelte`, reusing `PODIUM_BADGE_CLASSES`: responsive cells (`hidden lg:table-cell`, a `lg:hidden` stat line), `Feed` widened with `lg:max-w-none`, and skeletons that match the podium and table boxes.
- [x] 3.4 [designer] Move the rating card into `rating-summary.svelte` (wording from `rankStatus`, existing reduced-motion glow kept). Add `rating-rules.svelte` (400 start, ±8, floor 100, draws change nothing, one rating for every game). Export both from `leaderboard/index.ts` and `src/lib/features/core/index.ts`. (`standing.svelte` dropped with the Lobby and History sidebar.) Verify with `pnpm test`.

## 4. Lobby and the Leaderboard sidebar

- [x] 4.1 [engineer] Update `lobby.svelte.test.ts` first: an empty lobby shows "No open rooms right now" with Find match and Open a room links to `/play`. Then update the `EmptyState` in `lobby.svelte`. Verify with `pnpm test`.
- [x] 4.2 [designer] Pass a `sidebar` snippet in `src/routes/leaderboard/+page.svelte` (`RatingSummary` and `RatingRules`, aside ordered first below `lg`), only when signed in. Widen its `titleClass` so the title lines up with the content column. Lobby and History get no sidebar (dropped by user decision) and keep their centered `max-w-md` list.
- [x] 4.3 [designer] Add `min-h-0` to the sidebar grid and the content column in `src/lib/components/layout/page/page.svelte`, and change nothing else. Check at 1280×800 that the Leaderboard `Feed` scrolls inside the column.

## 5. Verification

- [x] 5.1 `pnpm test` passes.
- [x] 5.2 `pnpm check` reports 0 errors and 0 warnings.
- [x] 5.3 `pnpm format:check` passes.
- [x] 5.4 `pnpm build` succeeds.
- [x] 5.5 `.agents/scripts/layout-shift.mjs` on `/lobby`, `/history`, and `/leaderboard` at 360×640 and 1280×800, signed in and out, reports CLS ≤ 0.01.
- [ ] 5.6 Live QA (`browser-a` and `browser-b`). Check:
  - Abandon: Cancel keeps the room. Confirming forfeits the round with the expected copy, and the opponent sees the win.
  - History: day groups, the reason when present, "0" at the floor, and unique Replay names in the accessibility tree.
  - Leaderboard: podium, desktop table, pinned own row on scroll, "—" before stats, and the ratings text.
  - Leaderboard sidebar beside the ranks at 1280px and above them at 360px. No sidebar on Lobby or History at any width.
  - Empty states on all three pages show no action links.
  - Reduced motion: no pulse or glow.
