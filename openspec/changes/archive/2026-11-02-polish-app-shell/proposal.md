# Proposal

## Why

The app shell has gaps that every page inherits: no per-route metadata or install manifest, an icon-only header whose links carry no current-page state, no footer or mobile navigation, non-game pages that cannot scroll because the root frame is `h-dvh overflow-hidden`, primitives (Spinner, Tabs) without accessible roles, seat colors and caption sizes duplicated as literals, no feedback when a player's turn arrives in a background tab, a Clerk UI load failure (B11) that leaves every Convex query waiting forever, navigation links repeated across the header, footer, and avatar menu, layout that shifts on its own (late banners, font swap, loading states, and turn changes in game rooms), and a game-room status bar that at 360px leaves each player name about 9px wide, one letter. This is slice 1 of the product polish; it fixes the shell once so the page redesigns that follow build on it.

## What Changes

- Per-route `<title>`, description, Open Graph tags, favicon, `theme-color`, a web app manifest, and app icons in `static/`.
- Header: wordmark linking home; a `Link` (tailwind-variants) that sets `aria-current="page"` with visible focus rings; a raised `--ring` contrast; Sign in button for visitors (`auth.signIn()`); avatar with an accessible name opening a dropdown (Account via Clerk `openUserProfile`, Sign out). The Ko-fi link leaves the header for the footer only, drawn as an inline SVG instead of the external `storage.ko-fi.com` mask image.
- Live-game pill in the header for signed-in users with an active room, from the existing `rooms.active` query; the query is skipped when signed out.
- Mobile bottom tab bar below `sm` with Play, Lobby, History, and Leaderboard (the wordmark is the home link), hidden on game-room routes (matched by the `[code]` route id, not the `(games)` group, which also contains the landing page).
- Footer on non-game pages with Support and the copyright, plus only internal links that the header and tab bar don't render (none yet).
- No duplicate links: each destination has one navigation surface at a given width. `NAV_ITEMS` drops Home; the header shows the primary links at `sm` and up, the tab bar below `sm`.
- No layout shift: the auth error banner overlays instead of pushing content, the latin Inter file is preloaded with a size-adjusted fallback, loading placeholders take the box of their content, and game rooms keep every element in place when the turn changes (reserved indicator slots, fixed widths, a board-sized loading placeholder, a reserved error line). Measured with a `layout-shift` `PerformanceObserver` in live QA.
- Game-room player strips (the approved "Proposed · playing" and "Proposed · round over" mockups): the one-row status bar and the emoji columns beside the board give way to a strip above the board for the opponent and one below for the viewer (spectators: seat 1 above, seat 0 below). Each strip has the emoji box (the viewer's opens the trash-talk picker), the truncated name, the seat mark in the seat color, a status line, and the clock; the viewer's strip has a "YOU" tag, and the strip to move has a ring in its seat color. The board fills the width on phones. Round controls and the round counter stay below. Desktop gets the same strips; the side panel and result card stay in the later game-room change.
- QA fixes: after a signed-in render, an auth load failure keeps the tab bar and header links the server rendered; `/history` leaves the active room out of the list (the Playing card shows it); the tic-tac-toe and checkers game icons hold still under reduced motion; the header's auth control sits in one fixed slot so the avatar and Sign in swap moves nothing.
- Non-game routes scroll inside `<main>`; game rooms keep the fixed full-height frame. New page layout primitive with an optional `lg` sidebar.
- A `Page` title (`h1`), new shared `EmptyState`, `Skeleton`, and in-house `Toast` components, adopted only where the swap is trivial. Toast confirms the existing invite copy-link action on the Play page (`copyInviteLink` in `features/core/play`).
- `Spinner` exposes `role="status"` with a label; `Tabs` becomes a radiogroup with roving focus and arrow-key navigation.
- Seat colors unified as `--seat-0` / `--seat-1` CSS variables with a TypeScript mirror for Lottie and Sparkle, kept in sync by a test. One caption text size replaces the 13 `text-[10px]` / `text-[11px]` literals.
- `prefers-reduced-motion` stops the landing wordmark animation, the mood blobs, and the tic-tac-toe and checkers icon animations.
- Feed list gets a scroll fade at its edges.
- Your-turn alert: when the turn passes to the viewer while the tab is hidden, the document title flashes and a synthesized WebAudio chime plays (sound on by default). Backed by a new localStorage prefs module that a later settings page reuses.
- B11 fix: `ClerkAuth.load` catches a failed `@clerk/ui` or Clerk load, still resolves `#ready` so `fetchAccessToken` returns, and the shell shows an inline auth error banner.
- `.agents/skills/twoplay/references/conventions.md` gains a no-wrap rule, a no-layout-shift rule, and a copy/voice guideline (docs only, no spec).

Out of scope: redesigns of landing, play, lobby, history, or leaderboard; game-room UI beyond the layout-stability fixes and player strips above (the desktop side panel, result card, and the rest of the game-room redesign are a later slice); player ratings in the strips (they would need a Convex change); new pages; any game-engine, clock, Convex, or backend change.

## Capabilities

### New Capabilities

- `site-metadata`: per-route title, description, and Open Graph tags; favicon, theme color, web app manifest, and icons.
- `app-navigation`: header wordmark, current-page nav links, visitor sign-in, avatar menu, live-game pill, mobile tab bar and its game-room exclusion, footer.
- `page-layout`: which routes scroll and which keep the fixed frame, the page layout primitive with `lg` sidebar and title, EmptyState, Skeleton, and the Feed scroll fade.
- `ui-accessibility`: Spinner status role, Tabs radiogroup with roving focus, visible focus rings and ring contrast, reduced-motion behavior.
- `design-tokens`: seat color variables and their TypeScript mirror, the single caption size.
- `toast-notifications`: the Toast primitive and the copy-link confirmation.
- `user-preferences`: the localStorage prefs module (defaults, persistence, malformed-value fallback).
- `turn-alerts`: title flash and chime when the viewer's turn arrives in a hidden tab, honoring the sound preference.
- `client-auth`: Clerk client load failure handling, ready resolution, and the auth error banner.
- `player-strips`: the opponent and viewer strips around the board, their content and status line, the turn ring, the single status announcement, the phone board width, and the round controls below.
- `layout-stability`: the cumulative layout-shift budget on page load, a stable header, the overlaid auth banner, server-rendered chrome, font swap without reflow, placeholders that match their content, zero shift on turn changes and round end, member navigation kept through an auth load failure, and no history row inserted when a room starts.

### Modified Capabilities

None. `openspec/specs/` is empty.

## Impact

- Code: `src/routes/+layout.svelte`, `src/routes/layout.css`, `src/app.html`, `src/routes/(games)/+page.svelte`, `src/routes/(games)/{checkers,tictactoe}/[code]/[[round]]/+page.svelte`, `src/routes/{play,lobby,history,leaderboard}/+page.svelte`; `components/layout/{header,feed,board}` plus new `components/layout/{dock,footer,page}`; `components/ui/{spinner,tabs,dropdown,sparkle,emblem,playing}` plus new `components/ui/{toast,skeleton,empty-state,banner,link,meta}`; `services/auth/client/clerk.svelte.ts`; `utils/style/accents`; `features/play/games.ts` (`PLAYER_COLORS`); `features/presence/mood` plus new `features/presence/turn-alert`; `features/core/{play,lobby,history,leaderboard}`; `features/play/{tictactoe,checkers}` (turn-alert wiring, board-sized loading placeholder); `components/layout/board` (turn-change stability, new `board-placeholder`, player strips, new `strips.ts`); `features/core/history` (active room filtered, new `rooms.ts`); `src/lib/assets/icons/games/{tictactoe,checkers}.svelte` (reduced motion); `utils/navigation` (`NAV_ITEMS` without Home); `src/routes/layout.css.test.ts` (new); `utils/multiplayer/room` (viewer-turn flag); `utils/sound` (chime); `src/lib/assets` and `static/`.
- Shared symbols with callers: `ACCENTS` (board, playing, checkers, tictactoe, accents tests); `GAMES` / `PLAYER_COLORS` (playing, history, lobby, play, `games.test.ts`); `ClerkAuth.load` / `#ready` / `fetchAccessToken` (root layout, header, every Convex query through `setupAuth`); `Spinner` and `Tabs` (ui barrel, core feature consumers, their tests); `Header` (layout barrel, root layout); `NAV_ITEMS` (header, tab bar, footer, and their tests); `Board` and `BOARD_SIZE` (`tictactoe.svelte`, `checkers.svelte`, `board-placeholder.svelte`, `board.svelte.test.ts`, `board-placeholder.svelte.test.ts`); `ClerkAuth` member-nav flag (root layout, header).
- Trust boundary: client auth only. B11 changes how `ClerkAuth` handles a failed load; no server auth, schema, or Convex function changes. `rooms.active` is reused unchanged and keeps its server-side `ctx.auth` check.
- Dependencies: none added. Toast is in-house; the chime uses the WebAudio API.
- Browser APIs: `localStorage`, `document.visibilityState`, `AudioContext`, `matchMedia("(prefers-reduced-motion)")`.
