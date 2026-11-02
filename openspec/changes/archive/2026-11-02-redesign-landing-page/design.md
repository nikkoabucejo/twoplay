# Design

## Context

`src/routes/(games)/+page.svelte` renders the wordmark `h1` (with its `glow-pulse` style and reduced-motion guard), a row of `Emblem` links to `/play?game=<type>`, and a `min-h-18` slot holding Sign in when signed out. `/play` (`src/routes/play/+page.svelte`) already reads `?game=` and passes `initialGame` to `Play`, so preselection needs no change in files owned by `polish-new-game`. The root layout hydrates `ClerkAuth` from the server, so `auth.isSignedIn` is correct in SSR. The active room comes from `api.models.rooms.index.active`, which only resolves on the client, after first paint. `Page` (`src/lib/components/layout/page`) gives the centered `max-w-5xl` column. Its `sidebar` grid is fixed at `18rem` and stacks the sidebar _below_ the content, which is not the split this page needs.

## Goals / Non-Goals

**Goals:**

- One page component that serves both auth states with the same hero and card boxes, so signing in and the active-room query resolving move nothing below the action slot.
- Game copy lives in `GAMES`, the existing single source of game display metadata.

**Non-Goals:**

- Live room counts and the top-5 strip (deferred).
- Any edit to `/play`, `play.svelte`, header, footer, dock, lobby, history, leaderboard, or Convex.
- Interactive or live board previews.

## Decisions

### 1. A `home` leaf in `features/core`, rendered by a thin route

`src/lib/features/core/home/` holds `home.svelte` (`Home`), plus `game-card.svelte`, `preview.svelte`, and `steps.svelte` if they keep `home.svelte` readable, with `index.ts` exporting `Home`. `features/core/index.ts` adds `export { Home } from "./home/index.js";`. The route keeps `Meta` and renders `<Page><Home /></Page>`, like `/play` and `/lobby`.

- _Alternative:_ keep everything in `+page.svelte`. Rejected. Every other route is Meta + Page around its `features/core` counterpart (architecture.md), and the page grows past a readable size.

### 2. One action slot shared by actions and the resume banner

_Superseded later: the hero has no actions or banner (see proposal.md, Later Changes)._

The hero has a single fixed-height slot under the pitch. Signed out, it holds the two actions as `Button`s with `onclick={() => auth.signIn()}`, `disabled={auth.loadError !== null}`. Signed in with no active room, or while `active` is loading, it holds the same two actions as `Button href="/play"`. Signed in with an active room, it holds a "Resume your game" banner (game `Emblem`, `GAMES[type].name`, a `Button href={"/" + type + "/" + code}` labelled Resume) sized to the same box. Only the slot's content changes, so the cards and everything below keep their place.

- _Alternative A:_ a separate banner above the hero, inserted when the query resolves. Rejected: it pushes the page and breaks `layout-stability` "Stable page load".
- _Alternative B:_ an always-reserved empty banner slot. Rejected: it leaves a blank band for the common no-active-room case.
- _Alternative C:_ reuse `Playing` (`components/ui/playing`). Rejected for the banner: it builds a `TictactoeRoom`/`CheckersRoom` subscription with clocks and heartbeats, too heavy and too tall for a hero slot.

The href comes from `liveGameHref(active.data, page.url.pathname)` in `$lib/utils/navigation`, the helper the root layout already uses for the header pill, so the room path has one builder.

### 3. Layout: own grid inside `Page`, not `Page`'s sidebar

`Home` renders `grid gap-8 lg:grid-cols-2 lg:items-center` (or a fixed ratio), with the hero first and the card list second, so DOM order equals stacked order below `lg`. "How it works" follows as a full-width row. `Page` is used without `title`, since the wordmark is the page's `h1`.

- _Alternative:_ `Page`'s `sidebar` with the cards as sidebar. Rejected: it is `18rem` wide and stacks _below_, while the spec puts cards beside the hero at `lg` and needs a wider column for previews. Changing `Page` would affect every page.

### 4. Card copy in `GAMES`

`GameMeta` gains `description: string`, one sentence each, e.g. "Three in a row on a 3x3 grid." and "Jump and crown on an 8x8 board.". The landing reads `GAMES[type].description`. Cards render in `GAME_TYPES` order.

- _Alternative:_ a copy map local to `home/`. Rejected: `GAMES` is documented as the single source of a game's display data, and `Play` or `Lobby` may want the line later.

### 5. Static, decorative board previews

`preview.svelte` takes a `GameType` and draws a small fixed position in inline SVG: a 3x3 grid with a few X/O marks for tic-tac-toe, a 4x4 corner of a checkers board with a few pieces. Colors use `text-seat-0`/`text-seat-1` with `currentColor` or `fill-seat-N`. The SVG is `aria-hidden="true"` with a fixed `size-*` box so it never changes size.

- _Alternative:_ render a real `Board` or game component with a fake state. Rejected: those depend on room classes, mood context, and `BOARD_SIZE`, and are interactive.

### 6. Copy and motion

Pitch: "Real-time two-player games." plus one sentence such as "Match with a stranger or send a friend a code. Moves land live." Steps: "Sign in", "Pick a game", "Play live". Sentence case, no exclamation marks. Buttons stay `Button` (mono uppercase, `whitespace-nowrap`). Card hover uses `motion-safe:transition-transform` / opacity only. The wordmark style block moves with the hero unchanged, keeping its `prefers-reduced-motion` guard.

### Trust boundary

No Convex function is added or changed. `rooms.index.active` authenticates with `requireUser` and returns only the caller's room. The page skips it when signed out (`auth.isSignedIn ? {} : "skip"`, as the layout and `play.svelte` already do). The resume link is navigation only; the room route still runs its own membership checks.

## Risks / Trade-offs

- [The Resume banner and the actions differ in height] → Give the slot a fixed height (`h-*`) that fits both, and check with `.agents/scripts/layout-shift.mjs` at 360x640 and 1280x800, signed in with and without an active room.
- [Sign-in from the landing removes "How it works"] → It sits below the cards, so only content after the last card moves. That follows a user action, which the layout-shift budget excludes.
- [`games.ts` may also be edited by a parallel change] → The edit is one added field. Coordinate merge order with `polish-new-game` if it touches `GameMeta`.
- [Both signed-in actions go to `/play`] → "Play a friend" cannot preselect private mode until `/play` reads a mode param. See Open Questions.

## Open Questions

- Should signed-in "Play a friend" deep-link to private mode (e.g. `/play?mode=private`)? Assumed: links to `/play` until `polish-new-game` decides to read such a param. Changing the href later does not change the specs here.
