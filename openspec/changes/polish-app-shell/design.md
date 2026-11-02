# Design

## Context

See proposal.md for the motivation. These facts about the current code shape the design:

- `src/routes/+layout.svelte` renders one frame for every route: `div.relative.flex.h-dvh.flex-col.overflow-hidden` holding `<Mood>` (absolute background), `<Header />`, and `<main class="flex min-h-0 flex-1 flex-col">`. Nothing can scroll at the page level.
- Room routes have ids `/(games)/tictactoe/[code]/[[round]]` and `/(games)/checkers/[code]/[[round]]`. The landing page `/(games)` shares the `(games)` group, so the group can't be used to tell rooms apart from other pages.
- Seat colors are repeated in four forms: Tailwind classes in `ACCENTS` (`utils/style/accents`) and `mood.svelte`, hex `PLAYER_COLORS` in `features/play/games.ts`, hex `Sparkle` props in `(games)/+page.svelte` and `leaderboard.svelte`, and hex CSS in `emblem.svelte` and the landing `<style>`. `Sparkle` bakes the colors into Lottie JSON through `hexToRgba`, so it needs hex strings at script time.
- `ClerkAuth.load` (`services/auth/client/clerk.svelte.ts`) awaits `loadClerkUiScript` and `clerk.load` with no catch. `#resolveReady` runs only on success. `fetchAccessToken` awaits `#ready`, and `setupAuth` in the root layout passes it to convex-svelte, so a failed load leaves every authenticated query pending (B11).
- `Room` (`utils/multiplayer/room/room.svelte.ts`) already derives `myIndex` (null for spectators) and the abstract `activeSeat`. Both subclasses return null for `activeSeat` when the round isn't live, is over, has ended, or is waiting for a seat.
- `utils/sound` owns a lazily created `AudioContext` and the synthesized move and capture sounds.
- The copy-link action is `copyInviteLink` in `features/core/play/play.svelte`. It currently swaps the button label to "Copied" for 1.5 s and ignores clipboard failures.
- Vitest projects: `server` (node, `*.test.ts`) and `client` (jsdom, `*.svelte.test.ts`). Each source file has one test file with the same name (decisions.md).
- After groups 1-10, `NAV_ITEMS` (`utils/navigation/routes`) holds Home, Play, Lobby, History, and Leaderboard. `footer.svelte` renders all five plus Support; `header.svelte` renders them minus Home (signed in, `hidden sm:flex`); `dock.svelte` renders all five (`sm:hidden`); the avatar menu has Account, Support, and Sign out. The wordmark and the tab bar's Home both link to `/` below `sm`.
- Layout-shift sources in the current code: the auth error banner is a flow sibling between the header and `<main>`; `@fontsource-variable/inter` declares `font-display: swap` with a plain `sans-serif` fallback and nothing is preloaded; lobby, history, and leaderboard swap a one-line "Loading…" for their lists, and `Playing` appears on its own query; `tictactoe.svelte` and `checkers.svelte` swap a `Spinner` for the whole `Board`; in `board.svelte` the status bar's center column is `auto` width, the turn indicator reorders its arrow per seat, the round action button is only fixed-width from `sm`, and `footer.error` inserts a paragraph under the round counter.

## Goals / Non-Goals

**Goals:**

- Keep each new piece of logic in a pure function or a small rune class that Vitest can test without a browser, and keep the Svelte components thin.
- One frame per route type, chosen by one classifier.
- One definition for each seat color in CSS and one in TypeScript, with a test that keeps them in sync.
- Each destination is linked from one navigation surface at a given width.
- No layout moves unless the user moved it: cumulative layout shift at most 0.01 on load, zero entries on turn changes.

**Non-Goals:**

- No settings page. The prefs module only exposes what a settings page will need later.
- No change to `rooms.active` or any Convex function.
- No restyling of page bodies beyond the trivial adoptions listed in the proposal.
- No full game-room redesign. Room changes are limited to keeping boxes stable and to the player strips (D12). The desktop side panel and the result card stay in the later game-room change.
- No game-engine, clock, or Convex change for the strips.

## Decisions

### D1. Route classification by the `[code]` segment

Add `isGameRoomRoute(routeId: string | null): boolean` to a new leaf at `src/lib/utils/navigation/routes/index.ts`, exported from `$lib/utils/navigation`. It returns true when the route id has a path segment exactly equal to `[code]`. A null id (404) counts as a non-game route. The same leaf exports `liveGameHref(active, pathname)` (the active room's URL, or null when there's no room or the viewer is already in it), `isCurrentPath(pathname, href)` (exact match, or a prefix match ending at a segment boundary, never for `/`) and the `NAV_ITEMS` list that the header, tab bar, and footer all read.

- Alternatives: match the `(games)` group (wrong, because the landing page lives in it); a layout group such as `(room)` with its own `+layout.svelte` (the cleanest split, but it moves both room routes and changes their ids, which this slice keeps stable); per-page props telling the root layout which frame to use (nothing enforces them, and they drift).
- Why: a pure function of `page.route.id` is easy to test, works during SSR, and covers any future game that follows the `<game>/[code]` recipe in `games.md`.

### D2. Scroll model per route type

The root layout keeps the outer `h-dvh flex-col overflow-hidden` frame and the absolute `<Mood>` layer. It reads `isGameRoomRoute(page.route.id)` and switches only `<main>` and the chrome around it:

|                   | Game room                                                      | Non-game route                                                                     |
| ----------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `<main>`          | `overflow-hidden`, children fill the height (current behavior) | `overflow-y-auto overscroll-contain`                                               |
| Footer            | not rendered                                                   | rendered last inside `<main>`, so it scrolls with the content                      |
| Tab bar           | not rendered                                                   | `sm:hidden` sibling after `<main>` (signed in only), with bottom safe-area padding |
| Auth error banner | between header and main                                        | between header and main                                                            |

Pages build their content with a new `Page` layout component (`components/layout/page`): a centered `max-w-5xl` column, `min-h-full` so short pages still center vertically, and an optional `sidebar` snippet that sits in a `lg:grid-cols-[minmax(0,1fr)_18rem]` grid and stacks below the content under `lg`. Given a `title`, `Page` renders the single `h1` (with optional `description`, `actions`, and `titleClass`).

- Alternative: scroll the document with a sticky header and a fixed tab bar. Rejected because rooms need the fixed `h-dvh` frame, so `body` overflow would have to switch per route (layout jump on navigation), and the absolute `Mood` layer would need re-anchoring.
- Trade-off: SvelteKit restores window scroll, not element scroll. The layout resets `main.scrollTop = 0` in `afterNavigate` for non-popstate navigations. The mobile URL bar won't collapse on scroll, which is acceptable.

### D3. Seat tokens: CSS variables plus a TypeScript mirror, with a sync test

- `src/routes/layout.css` defines `--seat-0: #06b6d4; --seat-1: #ec4899;` in `:root`. `@theme inline` maps them to `--color-seat-0` and `--color-seat-1`, so `text-seat-0` and `bg-seat-1/25` are literal Tailwind classes.
- A new leaf `src/lib/utils/style/seats/index.ts` exports `SEAT_COLORS = ["#06b6d4", "#ec4899"] as const` for script-time consumers (`Sparkle`/Lottie, `GAMES[*].colors`). It is exported from `$lib/utils/style`.
- `ACCENTS` keeps its shape and keys but switches to the seat classes (`text-seat-0`, `bg-seat-0/25`, …). `mood.svelte` uses `bg-seat-*/NN`. `emblem.svelte` and the landing `<style>` use `var(--seat-*)`. `games.ts` replaces `PLAYER_COLORS` with `SEAT_COLORS`. Both `Sparkle` call sites pass `SEAT_COLORS`.
- Sync test (`utils/style/seats/index.test.ts`, server project): read `src/routes/layout.css` with `node:fs`, parse `--seat-(\d):\s*(#[0-9a-f]{6})`, and assert the result equals `SEAT_COLORS`. In the same file, walk `src/` (excluding `*.test.ts`, `layout.css`, and `seats/index.ts`) and assert there are no seat hex literals and no `cyan-500`/`pink-500`.
- Alternatives: TypeScript as the source, injecting `style="--seat-0:…"` at runtime (Tailwind can't see the tokens at build time, and SSR would need the inline style on every page); reading `getComputedStyle` in `Sparkle` (fails in jsdom and before the stylesheet applies, and adds a layout read).
- Trade-off: `ACCENTS` moves from Tailwind's oklch `cyan-500`/`pink-500` to the hex values that `GAMES` already uses. That is a barely visible shift, and it makes the two match.
- Caption: `@theme { --text-caption: 0.6875rem; --text-caption--line-height: 1rem; }` gives `text-caption` (11px), which replaces all 13 `text-[10px]` / `text-[11px]` uses. The three Board labels grow by 1px.

### D4. Toast store shape

A new leaf `components/ui/toast/` with:

```ts
type ToastTone = "default" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };
class Toaster {
	items = $state<ToastItem[]>([]); // newest last, length ≤ 3
	show(message: string, options?: { tone?: ToastTone; durationMs?: number }): number; // default 3000
	dismiss(id: number): void; // clears that toast's timer
}
export function setupToaster(): Toaster; // root layout, setContext
export function getToaster(): Toaster; // throws if not set up, like getClerkAuth
```

`ToastRegion.svelte` renders one `aria-live="polite"` container, fixed at the bottom and above the tab bar, with each item showing a dismiss button. Showing a fourth toast drops the oldest and clears its timer. The store uses context, not a module singleton, for the same SSR-isolation reason as `setupClerkAuth`. The Play page's `copyInviteLink` awaits `navigator.clipboard.writeText` and calls `toaster.show("Link copied")`, or on rejection `toaster.show("Couldn't copy the link", { tone: "error" })`. The `copied` label state is removed.

- Alternative: `svelte-sonner` (the shadcn-svelte default). Rejected per the brief: it adds a dependency and brings its own styling for a single call site.

### D5. Prefs module API

A new leaf `src/lib/utils/storage/preferences/` (category `$lib/utils/storage`):

```ts
type Preferences = { sound: boolean };
const DEFAULT_PREFERENCES: Preferences = { sound: true };
function parsePreferences(raw: string | null): Preferences; // per-field fallback, never throws
class PreferencesStore {
	sound = $state(true);
	constructor(storage: Pick<Storage, "getItem" | "setItem"> | null);
	setSound(value: boolean): void; // updates state, writes JSON, swallows storage errors
}
export function setupPreferences(): PreferencesStore; // root layout; storage = browser ? localStorage : null
export function getPreferences(): PreferencesStore;
```

Storage key `twoplay:prefs`, value is JSON. Reads also happen in try/catch because `localStorage` access itself can throw in privacy modes. Unknown keys are ignored, so later fields can be added without a migration. The settings page will call `setSound` and read `sound`. Cross-tab sync through the `storage` event is left out until a second preference needs it.

- Alternative: a `persisted` rune helper keyed per value. Rejected because one object with per-field validation keeps defaults and parsing in one place.

### D6. Detecting "your turn" from room state the client already has

- `Room` gains `isMyTurn = $derived(this.myIndex !== null && this.activeSeat === this.myIndex)`. `activeSeat` already encodes live, not over, not ended, and not waiting, and it derives from the live state, so scrubbing history doesn't change it. Spectators have `myIndex === null`.
- A new leaf `features/presence/turn-alert/` exports a pure `shouldAlert(previous: boolean | null, next: boolean, isHidden: boolean)`, which is true only for `previous === false && next && isHidden`. `previous === null` means the first observation, so there's no alert on load. It also exports the `TurnAlert` class.
- `TurnAlert(getIsMyTurn, deps)` runs an `$effect` that tracks `getIsMyTurn()` and stores the previous value. When `shouldAlert` fires, it captures `document.title`, flips the title between `"Your turn · <original>"` and the original every 1000 ms, and calls `playTurnChime()` (new in `utils/sound`) if `getPreferences().sound`. It stops and restores the title on `visibilitychange` to visible, when `isMyTurn` turns false, or on effect teardown when the component unmounts. `deps` (`document`, chime, prefs) can be injected for tests.
- Wiring: `tictactoe.svelte` and `checkers.svelte` each add `new TurnAlert(() => room.isMyTurn)` next to their `Room`. `Room` itself can't create it, because `utils` must not import `features`.
- Alternatives: watch `mood.status` (it has the active seat but not the viewer's seat); a server push or notification (out of scope, since there are no backend changes).
- Trade-off: browsers may keep the `AudioContext` suspended in a background tab that never had a user gesture. The chime is best effort, and the title flash is always the guaranteed signal.

### D7. B11 fix flow

```
load(key):
  if #loadPromise: return it            // re-entry guard (replaces the `if (this.#clerk)` check)
  #loadPromise = (async () => {
    try   { await loadClerkUiScript(key); clerk = new Clerk(key); await clerk.load(...);
            #clerk = clerk; #sync(); clerk.addListener(#sync) }
    catch (error) { loadError = message; isSignedIn = false; profile = user = session = null; loaded = true }
    finally { #resolveReady() }
  })()
```

- `fetchAccessToken` is unchanged: after `#ready` it returns null when `session` is null, which is always the case after a failure.
- `loadError = $state<string | null>(null)` is new public state. The root layout renders a `Banner` (`components/ui/banner`, `role="alert"`) with the message "Sign-in is unavailable right now." and a Reload action calling `location.reload()` when it's set. The header disables Sign in while it's set.
- Falling back to signed out keeps member-only UI from subscribing queries that would fail without a token. That's the hydrated-then-failed case.
- Test (`clerk.svelte.test.ts`, client project): mock `@clerk/clerk-js` and make the injected `<script>` fire `error`. Then assert that `load()` resolves, `loadError` is set, a `fetchAccessToken` started before the failure resolves `null`, and `isSignedIn` is false after a `hydrate` with a profile.
- Alternative: a load timeout for a stalled (not failed) request. Deferred; see Open Questions.

### D8. Metadata

A `Meta` component (`components/ui/meta`) takes `title?` and `description` and renders `<svelte:head>` with the title, description, and `og:*`. Each route renders it, and room routes pass `GAMES[type].name`. Static assets go in `static/`: `og.png` (1200x630), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `manifest.webmanifest`. `app.html` gets the manifest link, the `theme-color` meta, and the apple-touch-icon. The SVG favicon stays in `$lib/assets`.

### D9. Feed scroll fade

A pure `feedEdges({ scrollTop, scrollHeight, clientHeight })` returns `{ top, bottom }` with a 1px tolerance. It lives in `components/layout/feed/edges.ts`. `feed.svelte` recomputes it on `scroll` and through a `ResizeObserver`, and applies one of four literal `mask-image` gradient classes (none, top, bottom, both) with `cn()`. Literal classes follow rule 7.

- Alternative: CSS-only scroll-driven animations (`animation-timeline: scroll()`). Not yet supported in Firefox and Safari, so rejected.

### D10. One navigation surface per destination

| Destination              | Below `sm`                       | `sm` and up                      |
| ------------------------ | -------------------------------- | -------------------------------- |
| `/`                      | header wordmark                  | header wordmark                  |
| Play, Lobby, History, LB | tab bar (signed in)              | header primary links (signed in) |
| Support (Ko-fi)          | footer                           | footer                           |
| Account, Sign out        | avatar menu (actions, not links) | avatar menu                      |

- `NAV_ITEMS` drops Home and becomes the four primary links, read by the header and the tab bar. The header renders them directly instead of filtering out `/`. The wordmark stays the only link to `/`.
- The footer renders Support and the copyright with no internal nav. Later slices add How to play, About, Privacy, and Terms there; those pages don't exist yet, so the footer has no internal links in this slice.
- The avatar menu loses Support and keeps Account and Sign out.
- Signed-out visitors keep the wordmark and Sign in. They have no links to member pages, which matches the Visitor sign-in requirement; those pages already show their own sign-in prompt.
- Alternatives: keep Home in the tab bar and drop the wordmark's link below `sm` (the wordmark is the conventional home link and stays at every width, so this would make it inconsistent); keep the footer as a sitemap (it is exactly the duplication the user rejected).
- Tests: jsdom can't evaluate media queries, so each surface's test asserts its own hrefs plus its breakpoint class (`hidden sm:flex` on the header nav, `sm:hidden` on the tab bar), and the footer test asserts its hrefs are disjoint from `NAV_ITEMS` and `/`. Live QA checks displayed links at both widths.

### D11. Layout stability

**Measurement.** QA pastes this into the page before the action under test (or adds it with an init script before load) and reads `window.__cls` after:

```js
window.__cls = { score: 0, entries: [] };
new PerformanceObserver((list) => {
	for (const entry of list.getEntries()) {
		if (entry.hadRecentInput) continue;
		window.__cls.score += entry.value;
		window.__cls.entries.push({
			value: entry.value,
			sources: entry.sources.map((s) => s.node?.outerHTML.slice(0, 80))
		});
	}
}).observe({ type: "layout-shift", buffered: true });
```

The page-load budget is 0.01 per route, viewport, and auth state. Turn changes are zero entries. The audit in group 15 records the current numbers and the shifting nodes in `worklog.md` before any fix, as the failing evidence. Vitest can't measure layout in jsdom, so unit tests assert the structural cause of each fix (fixed classes, reserved slots, overlay positioning) and live QA measures the result.

**Per surface:**

- Auth error banner: positioned `absolute inset-x-0 top-full z-40` inside a `relative` wrapper around the header in `+layout.svelte`, so it overlays the top of `<main>`. Alternative: reserve a banner-height slot on every page. Rejected, because the banner is rare and an empty slot costs every user 40px.
- Header: already stable by structure. The left group (wordmark, primary links) is pinned left and the right group (pill, auth control) is pinned right by `justify-between`, so the pill grows leftward into free space and the auth control never moves. SSR seeds the auth state through `auth.hydrate(data.user)`, so Sign in versus avatar is decided on the server. The task locks this in with a test (auth control is the last element; the pill truncates and never wraps).
- Tab bar and footer: already rendered on the server from the hydrated auth state and `page.route.id`. Verified by `curl` on the built server, no code change.
- Fonts: preload `@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url` from `+layout.svelte`'s `<svelte:head>` with `crossorigin`, and declare `@font-face { font-family: "Inter Fallback"; src: local("Arial"); size-adjust: 107%; ascent-override: 90%; descent-override: 22.43%; line-gap-override: 0%; }` in `layout.css`, with `--font-sans: "Inter Variable", "Inter Fallback", sans-serif`. The override values are the usual Inter-on-Arial metrics and are tuned during the audit if the swap still shifts. Alternative: `font-display: optional`. Rejected, because a first visit on a slow link would render the whole session in the fallback.
- Loading placeholders (lobby, history, leaderboard, play): each page gates all of its queries in one loading branch, so `Playing` and the list appear in the same swap. The loading branch renders the loaded layout's containers (the `Feed` region, the rating card) with `Skeleton` rows inside, so the containers keep their size. `Feed` is already `flex-1 min-h-0`, so its box comes from the page, not its item count. `Page` is top-aligned (no vertical centering), so a height change below the header can't move the header. On `/play`, the active-room `Spinner` sits in a box with the picker's height.
- Game room loading (superseded in part by D12, which changes the placeholder's rows): a new `board-placeholder.svelte` in `components/layout/board` renders the Board's outer structure (status bar `h-12`, the square board area, the footer row and round line) at the same `--board-size`, with a centered `Spinner`. `board.svelte` moves its default `size` expression into an exported `BOARD_SIZE` constant in its module script, which both components use. `tictactoe.svelte` and `checkers.svelte` render it in their `room.isLoading` and `room.wrongGameType` branches.
- Turn changes in `board.svelte`. **Historical:** the status-bar center decisions below (content-sized center, stacked center layers, both-arrow turn indicator, per-side Win/Loss) were applied in groups 19.1-19.12 and are replaced by the player strips in D12. The fixed-width action button and the always-rendered error slot carry over.
  - The status bar grid is `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`: the center column is content-sized. Stability comes from the center rendering identical content on every turn change (both arrows always present, the inactive one `invisible`), so names and scores don't move when the turn passes. The center changes width only on Waiting to playing and on round end, and names and scores stay put there too. Alternative: a fixed `7rem` center. Rejected, because "◀ WIN · LOSS ▶" measures about 117px, wider than 7rem (112px), and at 360px a 7rem center leaves each player name about 12-20px, which is unreadable.
  - `turnIndicator` always renders both arrow slots and the word, toggling `invisible` and color on the arrows, so seat 0 and seat 1 produce the same elements.
  - Player names get `truncate`, and scores get `min-w-[2ch]` with `tabular-nums`.
  - The round action button is fixed width at every breakpoint (`w-28 sm:w-32`).
  - The error paragraph is always rendered as a one-line `h-5 truncate` slot whose text fades with opacity.
  - Clocks are already fixed boxes with tabular figures, and the history pill, forced-move rings, destination dots, and disconnect dot are already absolutely positioned.
- Toasts and turn alerts: `ToastRegion` is `fixed` and its items animate opacity only. `TurnAlert` touches only `document.title` and audio. No change, only measured.

Alternatives considered for turn-change stability: freezing the board area with `contain: layout size` on the status bar and footer (it hides symptoms inside the container but still lets the container's own content reflow, and it doesn't fix the label width changes); a full status-bar redesign (first deferred to the game-room slice, then pulled forward as the strips in D12 after live QA at 360px).

### D12. Player strips replace the status bar

Live QA at 360px: `BOARD_SIZE` is `min(calc(100vw - 9rem), …)`, so the status bar is 216px wide. After the center reserves its widest label (about 117px for "◀ WIN · LOSS ▶"), each name gets about 9px and shows one letter. The user approved the brainstorm board's "Proposed · playing" and "Proposed · round over" phone mockups.

Layout of `board.svelte`, top to bottom, all at `w-(--board-size)`:

1. Upper strip: the opponent (spectators: seat 1).
2. The square board area.
3. Lower strip: the viewer (spectators: seat 0).
4. Round controls row: previous round, the action button (`w-28 sm:w-32`), next round. No clocks.
5. "Round N of M", then the `h-5` error slot (unchanged).

One sr-only `role="status"` span holds `statusText(status)` (unchanged function); every visual label is `aria-hidden`.

Strip (`playerStrip(seat)` snippet in `board.svelte`): one `flex h-14 items-center gap-2 rounded-lg border bg-muted/40 px-2 whitespace-nowrap` row holding:

- the existing `emojiBox(seat)` (picker only when `myIndex === seat`; disconnect dot unchanged)
- a `min-w-0 flex-1` column: line 1 is the name (`truncate font-semibold`), the seat mark (`text-seat-N`, from a new optional `BoardPlayer.mark` string: X or O for tic-tac-toe, a default disc `●` otherwise), and the "YOU" tag (`text-caption`, own strip only). Line 2 is the status line.
- the clock box (moved from the footer row, `font-mono tabular-nums`, fixed width, low-time color unchanged)

Status line: every variant (Your turn, To move, Waiting, Won, Lost, Draw, score, blank) is rendered in one grid cell (`col-start-1 row-start-1`), and only the active one lacks `invisible`, the same technique as 19.12. Which variant is active comes from a pure helper.

Turn ring: every strip always has `ring-2`; the active seat's strip uses `ring-seat-N` and the other `ring-transparent`. Tailwind rings are `box-shadow`, so the box never changes.

Engineer pieces in a new leaf `components/layout/board/strips.ts` (server-project test `strips.test.ts`):

```ts
type StripLine = "your-turn" | "to-move" | "waiting" | "won" | "lost" | "draw" | "score" | "blank";
function stripSeats(myIndex: 0 | 1 | null): { top: 0 | 1; bottom: 0 | 1 };
function stripLine(status: BoardStatus, seat: 0 | 1, myIndex: 0 | 1 | null): StripLine;
function ringSeat(status: BoardStatus): 0 | 1 | null; // the turn seat, else null
```

`stripLine` rules: turn → `your-turn` on the viewer's seat, `to-move` on any other turn seat, `score` otherwise; winner → `won` / `lost`; draw → `draw`; waiting → seat 1 `waiting` (`blank` when closed), seat 0 `score`. The waiting seat is always seat 1 because the host takes seat 0 and the joiner seat 1 (`rooms.create` / `rooms.join`).

Size: `BOARD_SIZE` becomes `min(calc(100vw - 1.5rem), calc(100dvh - <height term>), 34rem)`. The width term is the room page's `px-3`; the height term covers the header, the page's `py-4`, two `h-14` strips, the controls row, the round line, the error slot, and the gaps. The designer sets the exact height term so the board is at least 300px wide at 360x640 and records the arithmetic in the module comment. `BoardPlaceholder` mirrors the new rows: strip slot, square, strip slot, controls row, round line, error slot, with no emoji columns.

Desktop: the same column at `--board-size` (capped at 34rem). The side-panel layout and the result card are in the later game-room change.

Callers: `tictactoe.svelte` passes `mark: markOf(seat)` per player (from `./types.js`); `checkers.svelte` leaves `mark` unset and gets the default disc. All other props and `mood.status` are unchanged.

- Alternative A: keep the one-row status bar and drop the emoji columns, giving it the full width. At 360px that's about 336px minus a 117px center, two scores, and padding, so about 80px per name. Rejected: the names still compete with the status for one row, the clocks stay apart from their players, and the user approved the strip mockup.
- Alternative B (chosen): two strips. Each name competes only with its own emoji, mark, tag, and clock, and the clocks sit with their players.
- Alternative C: the desktop side panel now. Deferred by the user to the game-room change.

Convention: none new. The stacked-variant technique and the no-wrap and no-layout-shift rules already exist in `conventions.md`.

### D13. Member navigation survives an auth load failure

QA 20.14 (now 25.14): at 360x640, a signed-in SSR followed by a blocked `@clerk/ui` load makes `auth.isSignedIn` false, so `showDock` in `+layout.svelte` drops the Dock and the footer moves (0.012). At 1280x800 the header nav disappears the same way.

- `ClerkAuth` gains `serverSignedIn` (set in `hydrate(profile)` to `profile !== null`, never cleared) and a getter `showsMemberNav = this.isSignedIn || (this.loadError !== null && this.serverSignedIn)`.
- `+layout.svelte`: `showDock = !isRoom && auth.showsMemberNav`. `header.svelte`: the primary `nav` renders on `auth.showsMemberNav`; the avatar versus Sign in choice stays on `auth.isSignedIn`. The `rooms.active` query and the pages stay on `isSignedIn`, so no member query subscribes without a token.
- The links lead to pages that show their signed-out prompt with Sign in disabled, which the user accepted.
- Header swap: the swap moves nothing. `header.svelte` wraps the auth control in one fixed-width, right-aligned slot (`flex w-20 shrink-0 justify-end`, sized to the Sign in button; the designer confirms the width against the rendered button) that holds either the avatar trigger or Sign in, so the slot has the same box in every auth state. The right group becomes `min-w-0 flex-1 justify-end`, so its start edge is fixed at the end of the left group and the live-game pill appears inside it without moving it. Before, the right group was content-sized and its start moved left when Sign in (wider) replaced the avatar or the pill appeared (QA 20.14: "header right group"). Cost: about 44px of empty space left of the avatar when signed in, inside free header space.
- Alternative: keep the avatar after a failure. Rejected: its menu actions (Account, Sign out) need Clerk, which failed.
- Alternative: drop the dock and accept the shift. Rejected: the user wants the server-rendered chrome to stay put.
- Alternative for the header: let the right group grow leftward (the earlier allowance). Rejected by the user: no header element may move on the swap.

### D14. History hides the active room

QA 20.14 (now 25.14) at 1280x800: a room started in another tab is inserted as the first history row, pushing every row down 118px (0.017), and it repeats the Playing card below.

- A pure helper `withoutActiveRoom(rooms, activeCode)` in `features/core/history/rooms.ts` (test `rooms.test.ts`) returns the list without the room whose `code` equals `activeCode` (unchanged when `activeCode` is null or undefined). `history.svelte` renders the filtered list and drops the `isActive` highlight, emblem `active`, and `Beacon` in rows.
- When the filtered list is empty, the page shows the empty state, with the Playing card below it when there is an active room, so a first-ever room starting doesn't swap the empty state for a feed.
- When the active room ends while the page is open, it appears as a new top row. That is a shift caused by the game finishing, not by a room starting; it stays out of scope (see Open Questions).
- Alternative: keep the row but reserve its slot. Rejected: the row has no height until the room exists, and it duplicates the Playing card.

### D15. Game icon motion

`src/lib/assets/icons/games/tictactoe.svelte` runs `tictactoe-wobble` infinitely. The `animation` declaration moves inside `@media (prefers-reduced-motion: no-preference)`, keeping the static `rotate` pose. Test: a client-project test reads the component source with `node:fs` and asserts the `animation:` declaration sits inside that media block (jsdom can't evaluate media queries).

`src/lib/assets/icons/games/checkers.svelte` animates with SMIL `<animate>` elements, which CSS media queries don't stop. The icon reads `prefersReducedMotion` from `svelte/motion` (a `MediaQuery` on `prefers-reduced-motion: reduce`, available in the installed Svelte 5.56) and renders the `<animate>` children only when `!prefersReducedMotion.current`. The shapes' own `points`, `cx`, and `cy` are already the first keyframe, so the reduced icon is the resting pose. Test: stub `window.matchMedia` in the client project; with `reduce` matching, the svg has no `animate` element and still has its three pieces; otherwise it has them.

- Alternative: `svg.pauseAnimations()` from a `matchMedia` check in an `$effect`. Rejected: it runs after mount, so the pieces can move for a frame, it needs a `bind:this`, and jsdom doesn't implement it, so the test would assert a mock call rather than the output.
- Trade-off: the server doesn't know the preference, so SSR renders the `<animate>` elements and hydration removes them for reduced-motion users. The icon has the same size either way, so nothing shifts.

## Trust boundary

No Convex function, schema, or server auth changes.

- The live-game pill subscribes `api.models.rooms.index.active` with `() => (auth.isSignedIn ? {} : "skip")`, the same pattern `play.svelte` uses. On the server, `active` runs `requireUser(ctx)` (`ctx.auth`) and returns only the caller's own room, so no room-membership check is needed and none changes.
- The B11 fallback only lowers client privileges: it reports signed out and sends no token. The server still verifies every token it receives.
- Turn alerts read only subscription data the viewer already receives. Nothing is sent.

## Impact callers

Groups 20-24 were added with D12-D15: 20 Player strip helpers [engineer], 21 Player strips [designer], 22 Member navigation on auth failure [engineer, designer], 23 History active room [engineer, designer], 24 Game icon motion [designer], 25 Verification. Group numbers refer to `tasks.md`: 1 Seat tokens and conventions [engineer], 2 Seat tokens in markup [designer], 3 Navigation utilities, 4 Preferences, sound, and turn alert, 5 Client auth, 6 UI primitive logic [engineer], 7 UI primitive markup [designer], 8 Layout components, 9 Root layout [engineer], 10 Routes, metadata, and motion [designer], 11 Page adoption logic [engineer], 12 Page adoption markup [designer], 13 Navigation items [engineer], 14 Navigation surfaces [designer], 15 Layout-shift audit and conventions [engineer], 16 Font and shell stability [engineer], 17 Shell stability markup [designer], 18 Page loading placeholders [designer], 19 Game-room stability [designer], 25 Verification. Groups 1-12 were written when Verification was group 13, and groups 13-19 when it was group 20; their `(13.N)` and `(20.N)` references mean `25.N`.

**ACCENTS**

- `utils/style/accents/index.ts` and `index.test.ts`: change in group 1 (seat classes, and the test asserts `seat-0` / `seat-1`).
- `components/layout/board/board.svelte`: unaffected by the ACCENTS change because it reads `ACCENTS[seat].tintBg` by key and the keys are unchanged. Its caption classes change in group 12.
- `components/ui/playing/playing.svelte`: unaffected, same reason (`.text` by key).
- `features/play/checkers/checkers.svelte`, `features/play/tictactoe/tictactoe.svelte`: unaffected by ACCENTS for the same reason. They change in group 4 to wire `TurnAlert`.

**GAMES / PLAYER_COLORS**

- `features/play/games.ts` and `games.test.ts`: change in group 1 (`SEAT_COLORS`).
- `playing.svelte`, `features/core/{history,lobby,play}`: unaffected because they read `GAMES[type].colors` and the values are identical.
- `routes/(games)/+page.svelte`: changes in group 2 (Sparkle and title CSS use the seat tokens) and group 10 (Meta, reduced motion).
- `features/core/leaderboard/leaderboard.svelte`: changes in group 2 (Sparkle literal) and group 12 (captions, page adoption).
- `components/ui/emblem/emblem.svelte`: changes in group 2 (`var(--seat-*)`). `emblem.svelte.test.ts` is unaffected because it passes colors as props.
- `features/presence/mood/mood.svelte`: changes in group 2 (seat classes) and group 10 (reduced motion). `mood.svelte.test.ts` is unaffected because it asserts grayscale and opacity, not color classes.

**ClerkAuth.load / #ready / fetchAccessToken**

- `services/auth/client/clerk.svelte.ts` and the new `clerk.svelte.test.ts`: group 5.
- `services/auth/{index.ts,client/index.ts}`: unaffected because they export the class and `loadError` is a field on it.
- `routes/+layout.svelte`: changes in group 9 (banner, providers). The `auth.load(...)` call stays and no longer rejects.
- `components/layout/header/header.svelte`: changes in group 8 (Sign in disabled on `loadError`).
- Every `useQuery` through `setupAuth`: unaffected because `fetchAccessToken` keeps its signature. After a failure it resolves `null` instead of hanging.
- `getClerkAuth()` readers (`features/core/{history,leaderboard,lobby,play}`, `features/play/{checkers,tictactoe}`, `routes/(games)/+page.svelte`): unaffected because they read `isSignedIn`, which becomes false after a failed load, so they render their existing signed-out state.

**Spinner**

- `components/ui/spinner/spinner.svelte` and its test: change in group 7.
- `components/ui/index.ts`: changes in groups 6 and 7 (new exports).
- `<Spinner size="lg" />` in `play.svelte`, `checkers.svelte`, `tictactoe.svelte`: unaffected because `label` defaults to "Loading".

**Tabs**

- `components/ui/tabs/tabs.svelte` and its test: change in group 6.
- `features/core/play/play.svelte`: unaffected by Tabs because the props API (`items`, `value`, `onValueChange`, `disabled`) is unchanged. It changes in group 11 for the copy-link toast.

**Header**

- `components/layout/header/header.svelte` and `components/layout/index.ts`: change in group 8. The header and its test change again in group 14 (no Support item, `NAV_ITEMS` without filtering) and group 17 (stability test).
- `routes/+layout.svelte`: changes in group 9, and in group 16 (font preload, banner wrapper).

**NAV_ITEMS**

- `utils/navigation/routes/index.ts` and `index.test.ts`: group 13 (Home removed).
- `components/layout/dock/dock.svelte`: no markup change; it renders `NAV_ITEMS`, so it loses Home. Its test changes in group 13.
- `components/layout/header/header.svelte`: group 14 (drops the `/` filter).
- `components/layout/footer/footer.svelte` and its test: group 14 (stops rendering `NAV_ITEMS`).

**Board**

- `components/layout/board/board.svelte` and `board.svelte.test.ts`: group 19 (stable status bar, action button, error slot, `BOARD_SIZE`).
- `features/play/{tictactoe,checkers}/*.svelte`: group 19 (render `BoardPlaceholder` while loading), and group 21 (pass `mark` per player). Other `Board` props are unchanged.
- `components/layout/board/board.svelte`, `board-placeholder.svelte`, and their tests: group 21 (strips, `BOARD_SIZE`). The 19.x center tests are replaced there. `BOARD_SIZE` callers: `board-placeholder.svelte`, `board/index.ts`, and both tests.
- `components/layout/board/strips.ts`: new in group 20.

**ClerkAuth.showsMemberNav (D13)**

- `services/auth/client/clerk.svelte.ts` and `clerk.svelte.test.ts`: group 22.
- `routes/+layout.svelte` (`showDock`, which also feeds `ToastRegion aboveDock`) and `components/layout/header/header.svelte` (primary `nav`, fixed auth slot, `flex-1` right group): group 22. The header test's 17.3 auth-control case is replaced in 22.7.
- `assets/icons/games/{tictactoe,checkers}.svelte`: group 24. Their users (`GAMES[*].icon` in play, lobby, history, landing) are unaffected because the props are unchanged.
- Other `isSignedIn` readers (pages, `rooms.active` in the layout): unchanged.

**History (D14)**

- `features/core/history/history.svelte` and `history.svelte.test.ts`, new `rooms.ts` / `rooms.test.ts`: group 23. `rooms.history` on the server is unchanged.

**Room / sound / Feed**

- `utils/multiplayer/room/room.svelte.ts` and its test: change in group 4 (`isMyTurn`).
- `TictactoeRoom` and `CheckersRoom`: unaffected because `isMyTurn` derives from their existing `activeSeat`.
- `utils/sound/index.ts` and its test: change in group 4 (`playTurnChime`). The existing callers are unaffected.
- `components/layout/feed/`: the fade logic changes in group 11 and the markup in group 12. `lobby`, `history`, and `leaderboard` are unaffected because the props are unchanged.

## Risks / Trade-offs

- [Element scroll loses SvelteKit's scroll restoration] → Reset `main.scrollTop` in `afterNavigate`. Back-navigation returns to the top, which is acceptable for these pages.
- [The chime is silent in background tabs without a prior gesture] → The title flash always runs. `prepareSound()` is already called on board interaction.
- [Pages built for the fixed frame (`flex-1 justify-center`) change look once `main` scrolls] → `Page` uses `min-h-full` and centered content, and qa checks each page at 360px and 1280px.
- [ACCENTS hue shifts slightly from Tailwind oklch to hex] → Accepted, since it now matches Emblem, Sparkle, and the landing title.
- [The tab bar overlaps content on iOS] → Safe-area padding, and the bar is a flex sibling, not `position: fixed`.
- [Title flashing fights SvelteKit's `<title>` updates] → Only room routes alert, and their title doesn't change while you stay in the room. Teardown restores the captured title.
- [Fallback metric overrides don't match Inter on every OS] → `local("Arial")` is missing on some Linux systems, where the generic fallback is used. The audit measures the swap on the QA browsers and the values are tuned there; preloading makes the swap usually happen before first paint.
- [The content-sized status center column changes width between states] → Historical; the strips (D12) replace the center column.
- [Strips take two rows of height, so on short landscape phones the board shrinks] → `BOARD_SIZE`'s height term keeps the whole column in `100dvh`; the board gets smaller, never cut off.
- [The waiting seat is assumed to be seat 1] → True for every room the server creates today; `stripLine` tests pin it, and a later change that seats joiners elsewhere must update the helper.
- [Member links after an auth failure lead to pages that can't sign in] → Accepted by the user; the banner offers Reload.
- [Layout-shift measurement is Chromium-only] → `layout-shift` entries exist only in Chromium, which is what `browser-a` and `browser-b` run. Other engines are not measured.

## Migration Plan

Client-only and stateless. `twoplay:prefs` is created on first write. Rollback is a revert.

## Open Questions

- Signed-out visitors no longer see any link to Play, Lobby, History, or Leaderboard, because the footer stops repeating the nav. Assumed acceptable: those pages require sign-in, and the landing page and Sign in remain.
- The history list still gains a row when the active room ends while `/history` is open (D14). Assumed out of scope.
- Should a stalled (never settling) Clerk script count as a failure after a timeout? The current fix covers rejection, which is the B11 repro. A timeout could be added later behind the same `loadError` path without changing the specs' structure.
