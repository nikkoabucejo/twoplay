---
name: skeleton
description:
  Build and verify loading skeletons in twoplay so the skeleton takes the exact box of the UI that
  replaces it: same width, height, padding, gaps, row heights, and line boxes. Load before writing
  or editing any skeleton, placeholder, or loading state, before replacing a spinner, and whenever
  a loaded view moves, grows, or jumps after data arrives. Includes a measurement script that
  compares the held-loading page against the loaded page; a skeleton is not done until it passes.
---

# Skeleton

A skeleton is a promise about layout: when data arrives, nothing moves. Every skeleton here is
written from the loaded markup and then measured against it. Don't eyeball it.

## When to use a skeleton vs a spinner

- **Skeleton:** any region waiting on a query: lists, cards, tables, stats, the board, a view
  whose shape is known before its data.
- **Spinner:** only inside a control while an action the user started is pending ("Finding…"
  in a button). Never for a region, a page, or a card.
- A region that renders invisibly while loading (`invisible`) still gets a visible skeleton in
  the same grid cell, not a spinner overlay.

## Write-time rules

1. **Start from the loaded markup.** Copy its outer containers verbatim: the same element nesting,
   flex/grid, `gap-*`, `p-*`, `border`, `rounded-*`, `max-w-*`, `flex-1`/`min-h-0`. Swap only the
   leaves for `Skeleton`.
2. **Share the class strings.** When the loaded UI and the skeleton use the same box, lift the
   string into a constant and use it in both (`PODIUM_CARD_CLASS`, `RATING_CARD_CLASS`,
   `ROW_CLASS` in history, `BOARD_CHROME`/`BOARD_SIZE`). Never retype a grid template.
3. **Text is a line box, not a bar.** A line of text is as tall as its line-height, not its
   font size. Use `<Skeleton variant="text" class="h-N w-…" />` with `h-N` equal to the line
   height. The variant paints a thinner bar inside that box.

   | text class          | line box |
   | ------------------- | -------- |
   | `text-caption`      | `h-4`    |
   | `text-xs`           | `h-4`    |
   | `text-sm`           | `h-5`    |
   | `text-base`         | `h-6`    |
   | `text-2xl`          | `h-8`    |
   | `text-3xl`          | `h-9`    |
   | `text-4xl`          | `h-10`   |

   Stacked lines with no `gap` in the loaded UI get no `gap` in the skeleton.
4. **Fixed-size things copy their size.** Emblem `size-8` → `Skeleton class="size-8 rounded-full"`.
   Button `size="xs"` → `h-6`, `size="sm"` → `h-8`, default → `h-9`. Badges and icons copy their
   `size-*`.
5. **Every column, every breakpoint.** If the loaded UI shows a column, button, or header only at
   `lg:` or `@sm:`, the skeleton shows a placeholder under the same variant. Headings, table
   headers, and day labels get placeholders too.
6. **Same row count as a typical result.** Use a constant (`SKELETON_ROWS`), not a magic number
   in markup. Five rows for feeds unless the real list has a fixed length (one per `GAME_TYPES`).
7. **Accessibility.** The skeleton root is `role="status"` with an `sr-only` label; the bars are
   `aria-hidden` (Skeleton does this). A skeleton inside an already-labeled region is
   `aria-hidden="true"` as a whole.
8. **Pair it for the checker.** Put `data-loading="<name>"` on the skeleton root and
   `data-loaded="<name>"` on the root of the UI that replaces it. Both roots must be the
   element that occupies the slot (the `{#if}` branch root). Components that take a root
   (`Feed`, `FeedSkeleton`) spread rest props, so pass the attribute straight through.

## Verify (required)

The dev server must be running at `http://localhost:5173`; never start or stop it.

```sh
node .agents/scripts/skeleton-match.mjs /history,/leaderboard,/me,/play
```

The script copies a signed-in profile (`PROFILE`, default `player-d`) and loads each route twice:
once with the Convex websocket held, so the skeleton stays, and once live. It prints one JSON line
per route and viewport (360 and 1280 wide by default) and exits 1 on any issue:

- `region`: the skeleton root and the loaded root differ in position or width. Fix the outer
  classes.
- `length` (a note, not a failure): only the height differs, because the account has more or
  fewer rows than the skeleton. Rows are still compared up to the shorter list.
- `leaves`: a loaded leaf (text, icon, button) has no skeleton leaf on its row (`missing`), or the
  skeleton leaf on its row has a different top or height. Fix the line box or the row.
  Text is measured as its line box (one line-height per line), buttons and inputs as their whole
  box, and a filled or bordered badge as its whole box. Sticky or fixed rows inside the region
  (a pinned "your row") are skipped.
- `around`: something outside the region moved between the two states. The region's height
  is wrong, or a sibling appears only after loading.
- `unpaired`: no `[data-loading]` while held, or no `[data-loaded]` after loading. The page
  errored, or the account shows the empty state. Seed data first (below).

Then **look at the overlay**: `$OUT/<route>-<viewport>-overlay.png` (default
`$TMPDIR/skeleton-match`, printed at the end) draws the skeleton at 50% over the loaded page. A correct skeleton
shows single edges; a misfit shows double edges. Read the image with the Read tool.

A skeleton that shares a grid cell with its loaded UI (`col-start-1 row-start-1`, as in `/play`)
always passes `region`, because both roots stretch to the cell. There, only `leaves` and the
overlay prove the fit.

Loop until every line is `"ok": true` and the overlay shows single edges at both widths. Only then
report the skeleton done.

### Getting a loaded state

The checker needs real data on the account:
- `/history`, `/me`: the profile has finished games. If it shows the empty state, play a round
  with the `qa` agent in two browsers.
- `/lobby`: another player has a public room waiting for an opponent. A "Find match" search
  doesn't count; it's a queue, not a lobby room.
- Game rooms: pass a real room path (`/tictactoe/ABCD`) for a room the profile is seated in.
- Signed-out skeletons: `--signed-out`.

### When the script can't get a loaded state

- Both screenshots show the skeleton: the app never finished loading. Open the page in a
  browser and read the console. A `lifecycle_outside_component` error from `setupConvex` means
  Vite's dependency pre-bundle is stale; ask the user to restart the dev server.
- The loaded screenshot shows a sign-in gate: the copied profile's session expired. Sign that
  browser in again (see the `qa` agent) or pick another `PROFILE`.

## Unit tests

Behavior tests only (see the `twoplay` skill). For a skeleton that means: it announces loading,
renders the expected number of rows, passes `data-*` through, and hides bars from assistive tech.
Don't assert pixel classes beyond the box contract the test file already documents. The script
checks geometry.

## Done checklist

- [ ] Built from the loaded markup, with shared class constants for every repeated box
- [ ] Text uses `variant="text"` with the line-height table
- [ ] Every column, header, and button the loaded UI shows at each breakpoint has a placeholder
- [ ] `data-loading` / `data-loaded` pair on the two roots
- [ ] `skeleton-match.mjs` prints `"ok": true` for every route at 360 and 1280
- [ ] Overlay PNGs checked by eye
- [ ] No spinner left for a region (`grep -rn "Spinner" src` shows only in-control pending states)
