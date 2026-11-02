# Tasks

## 1. Seat tokens and conventions [engineer]

- [x] 1.1 [engineer] Write `src/lib/utils/style/seats/index.test.ts` (server project), `describe("SEAT_COLORS")`: read `src/routes/layout.css` with `node:fs`, parse `--seat-(\d):\s*(#[0-9a-f]{6})`, and assert the result equals `SEAT_COLORS`. Verify it fails before 1.2 and 1.3.
- [x] 1.2 [engineer] In `src/routes/layout.css`, add `--seat-0: #06b6d4; --seat-1: #ec4899;` to `:root`, and `--color-seat-0` / `--color-seat-1` mapped to them in `@theme inline`. Verify `text-seat-0` compiles in `pnpm build`.
- [x] 1.3 [engineer] Create `src/lib/utils/style/seats/index.ts` exporting `SEAT_COLORS` (`as const`) and add it to `src/lib/utils/style/index.ts`. Verify 1.1 passes.
- [x] 1.4 [engineer] Update `src/lib/utils/style/accents/index.test.ts` to expect `seat-0` classes for seat 0 and `seat-1` classes for seat 1 on every key. Verify it fails before 1.5.
- [x] 1.5 [engineer] Switch `ACCENTS` in `src/lib/utils/style/accents/index.ts` to the literal classes `text-seat-N`, `bg-seat-N`, `bg-seat-N/25`, `bg-seat-N/10`, keeping the keys. Verify 1.4 passes.
- [x] 1.6 [engineer] Update `src/lib/features/play/games.test.ts` to assert every game's `colors` equals `SEAT_COLORS`. Verify the test fails until 1.7.
- [x] 1.7 [engineer] Replace `PLAYER_COLORS` with `SEAT_COLORS` in `src/lib/features/play/games.ts`. Verify 1.6 passes.
- [x] 1.8 [engineer] Edit `.agents/skills/twoplay/references/conventions.md` (Styling section):
  - a no-wrap rule for single-line UI labels
  - a copy/voice guideline
  - use `text-seat-N` / `SEAT_COLORS` and `text-caption`, never raw seat hex values or `text-[Npx]`
    Verify with `pnpm format:check`.

## 2. Seat tokens in markup [designer]

- [x] 2.1 [designer] Add a test to `src/lib/utils/style/seats/index.test.ts` that walks non-test files under `src/` (excluding `src/routes/layout.css` and `seats/index.ts`) and asserts there are no `#06b6d4`, `#ec4899`, `cyan-500`, or `pink-500` matches. Verify it fails before 2.2 through 2.5.
- [x] 2.2 [designer] Replace `bg-cyan-500/NN` and `bg-pink-500/NN` with `bg-seat-0/NN` and `bg-seat-1/NN` in `src/lib/features/presence/mood/mood.svelte`. Verify `mood.svelte.test.ts` still passes.
- [x] 2.3 [designer] Replace the hex fallbacks in `src/lib/components/ui/emblem/emblem.svelte` with `var(--seat-0)` / `var(--seat-1)`. Verify `emblem.svelte.test.ts` passes.
- [x] 2.4 [designer] In `src/routes/(games)/+page.svelte`, pass `SEAT_COLORS` to `Sparkle` and use `var(--seat-0)` / `var(--seat-1)` in the title `<style>`.
- [x] 2.5 [designer] Pass `SEAT_COLORS` to `Sparkle` in `src/lib/features/core/leaderboard/leaderboard.svelte`. Verify 2.1 passes.
- [x] 2.6 [designer] Add `--text-caption: 0.6875rem; --text-caption--line-height: 1rem;` to `@theme` in `src/routes/layout.css`. Verify `text-caption` compiles in `pnpm build`.
- [x] 2.7 [designer] Raise the dark `--ring` to `oklch(0.708 0 0)` in `src/routes/layout.css`. Verify the composited ring contrast is at least 3:1 in live QA (13.10).

## 3. Navigation utilities [engineer] (parallel-safe)

- [x] 3.1 [engineer] Write `src/lib/utils/navigation/routes/index.test.ts` (server project).
  - `isGameRoomRoute`: true for `/(games)/tictactoe/[code]/[[round]]` and `/(games)/checkers/[code]/[[round]]`; false for `/(games)`, `/play`, and `null`.
  - `isCurrentPath`: `/lobby` matches `/lobby`, `/history/x` matches `/history`, `/playground` does not match `/play`, and `/` is not current on `/play`.
  - `liveGameHref`: null when there is no active room, null when the pathname is inside that room, `/tictactoe/ABCD` otherwise.
  - `NAV_ITEMS` hrefs are `/`, `/play`, `/lobby`, `/history`, `/leaderboard`.
    Verify it fails before 3.2.
- [x] 3.2 [engineer] Implement `isGameRoomRoute`, `isCurrentPath`, `liveGameHref`, and `NAV_ITEMS` in `src/lib/utils/navigation/routes/index.ts`. Verify 3.1 passes.
- [x] 3.3 [engineer] Create the barrel `src/lib/utils/navigation/index.ts` with named exports. Verify `pnpm check`.

## 4. Preferences, sound, and turn alert [engineer] (parallel-safe)

- [x] 4.1 [engineer] Write `src/lib/utils/storage/preferences/preferences.svelte.test.ts`:
  - nothing stored means sound is on
  - `setSound(false)`, then a new store on the same storage reads off
  - `not json` falls back to defaults
  - `{"sound":"yes"}` reads sound on
  - storage whose `getItem` / `setItem` throw reads defaults, and writes don't throw
  - `getPreferences()` without setup throws
    Verify it fails before 4.2.
- [x] 4.2 [engineer] Implement `parsePreferences`, `PreferencesStore`, `setupPreferences`, and `getPreferences` in `src/lib/utils/storage/preferences/preferences.svelte.ts`, plus `index.ts` and the barrel `src/lib/utils/storage/index.ts`. Use the key `twoplay:prefs`. Verify 4.1 passes.
- [x] 4.3 [engineer] Add a `describe("playTurnChime")` to `src/lib/utils/sound/index.test.ts`: it schedules oscillators on the shared context and is a no-op without `window`. Verify it fails before 4.4.
- [x] 4.4 [engineer] Implement `playTurnChime()` in `src/lib/utils/sound/index.ts`. Verify 4.3 and the existing sound tests pass.
- [x] 4.5 [engineer] Add `isMyTurn` cases to `src/lib/utils/multiplayer/room/room.svelte.test.ts` using `fake-convex.svelte.ts`:
  - true when the seated viewer is the active seat
  - false on the opponent's turn
  - false for a spectator (`myIndex: null`)
  - false while waiting for an opponent
    Verify they fail before 4.6.
- [x] 4.6 [engineer] Add `isMyTurn = $derived(...)` to `Room` in `src/lib/utils/multiplayer/room/room.svelte.ts`. Verify 4.5 and both game `game.svelte.test.ts` files pass.
- [x] 4.7 [engineer] Write `src/lib/features/presence/turn-alert/turn-alert.svelte.test.ts` with a table for `shouldAlert` (`null→true` no alert, `false→true` hidden alerts, visible no alert). Test `TurnAlert` with fake timers and injected `document`, chime, and prefs:
  - a hidden transition plays the chime once and alternates the title
  - sound off flashes the title with no chime
  - `visibilitychange` to visible restores the original title
  - the turn leaving the viewer stops the flash
  - teardown restores the title
  - a spectator getter that is always false never alerts
    Verify it fails before 4.8.
- [x] 4.8 [engineer] Implement `shouldAlert` and `TurnAlert` in `src/lib/features/presence/turn-alert/turn-alert.svelte.ts`, plus `index.ts`, and export them from `src/lib/features/presence/index.ts`. Verify 4.7 passes.
- [x] 4.9 [engineer] Add `new TurnAlert(() => room.isMyTurn)` after the room in `src/lib/features/play/tictactoe/tictactoe.svelte` and `src/lib/features/play/checkers/checkers.svelte`. Verify `pnpm check` and that two-browser alert QA passes (13.8).

## 5. Client auth [engineer] (parallel-safe)

- [x] 5.1 [engineer] Write `src/lib/services/auth/client/clerk.svelte.test.ts`. Mock `@clerk/clerk-js` and make the appended `<script>` fire `error`. Then assert:
  - `load()` resolves with no unhandled rejection
  - `loadError` is set
  - a `fetchAccessToken` started before the failure resolves `null`
  - one started after the failure resolves `null`
  - after `hydrate(profile)` then a failure, `isSignedIn` is false
  - a successful load leaves `loadError` null
  - a second `load()` call reuses the first
    Verify it fails before 5.2.
- [x] 5.2 [engineer] In `src/lib/services/auth/client/clerk.svelte.ts`:
  - add `loadError = $state<string | null>(null)`
  - replace the `#clerk` guard with `#loadPromise`
  - wrap the load in try/catch/finally: on failure, fall back to signed out and set `loaded`; always call `#resolveReady()` in `finally`
    Verify 5.1 passes.

## 6. UI primitive logic [engineer]

- [x] 6.1 [engineer] Rewrite `src/lib/components/ui/tabs/tabs.svelte.test.ts`:
  - the container has role `radiogroup`, items have role `radio`
  - `aria-checked` and `tabindex="0"` only on the selected item
  - ArrowRight on the last item wraps to the first and calls `onValueChange`
  - ArrowLeft and ArrowUp go back, Home and End jump to the ends
  - disabled tabs ignore the keys
    Verify it fails before 6.2.
- [x] 6.2 [engineer] Implement radiogroup roles, roving `tabindex`, and a keydown handler that moves focus in `src/lib/components/ui/tabs/tabs.svelte`, keeping the props API. Verify 6.1 passes and `play.svelte` type-checks.
- [x] 6.3 [engineer] Write `src/lib/components/ui/toast/toaster.svelte.test.ts` with fake timers:
  - `show` returns an id and expires after 3000 ms
  - `durationMs` overrides the duration
  - `dismiss(id)` removes only that toast
  - a fourth `show` drops the oldest and clears its timer
  - `getToaster()` without setup throws
    Verify it fails before 6.4.
- [x] 6.4 [engineer] Implement `Toaster`, `setupToaster`, `getToaster`, and the `ToastItem` type in `src/lib/components/ui/toast/toaster.svelte.ts`, plus `index.ts`, and export them from `src/lib/components/ui/index.ts`. Verify 6.3 passes.

## 7. UI primitive markup [designer]

- [x] 7.1 [designer] Update `src/lib/components/ui/spinner/spinner.svelte.test.ts`: by default it is found by role `status` with name "Loading", and `label="Finding opponent"` sets the name. Verify it fails before 7.2.
- [x] 7.2 [designer] Wrap the icon in `src/lib/components/ui/spinner/spinner.svelte` in an element with `role="status"`, give the icon `aria-hidden="true"`, add a `label` prop (default "Loading") rendered `sr-only`, and export `SpinnerProps` from the ui barrel. Verify 7.1 passes.
- [x] 7.3 [designer] Write `src/lib/components/ui/toast/toast-region.svelte.test.ts`:
  - messages render inside `aria-live="polite"`
  - the dismiss button calls `toaster.dismiss`
  - the error tone gets the destructive style
  - focus doesn't move on show
    Verify it fails before 7.4.
- [x] 7.4 [designer] Implement `src/lib/components/ui/toast/toast-region.svelte`: fixed at the bottom, above the tab bar's height below `sm`, with `whitespace-nowrap` truncation per conventions. Export it as `ToastRegion`. Verify 7.3 passes.
- [x] 7.5 [designer] Write `src/lib/components/ui/skeleton/skeleton.svelte.test.ts`: `aria-hidden="true"`, and a `motion-safe:animate-pulse` class with no unconditional `animate-pulse`. Verify it fails before 7.6.
- [x] 7.6 [designer] Implement `src/lib/components/ui/skeleton/skeleton.svelte` and `index.ts`, and export it from the ui barrel. Verify 7.5 passes.
- [x] 7.7 [designer] Write `src/lib/components/ui/empty-state/empty-state.svelte.test.ts`: it renders the title and description, and renders the `action` snippet only when given. Verify it fails before 7.8.
- [x] 7.8 [designer] Implement `src/lib/components/ui/empty-state/empty-state.svelte` and `index.ts`, and export it from the ui barrel. Verify 7.7 passes.

## 8. Layout components [designer]

- [x] 8.1 [designer] Add the inline-SVG Ko-fi cup `src/lib/assets/icons/brand/kofi.svelte` with the barrel `src/lib/assets/icons/brand/index.ts`. Verify `pnpm check`.
- [x] 8.2 [designer] Write `src/lib/components/ui/link/link.svelte.test.ts`: `aria-current="page"` when `pathname` is current for `href` (via `isCurrentPath`), absent otherwise, and focus-visible ring classes present. Verify it fails before 8.3.
- [x] 8.3 [designer] Implement `src/lib/components/ui/link/link.svelte` with a `tv()` variant `current: true|false` (full-opacity `focus-visible:ring-ring`), plus `index.ts`. Verify 8.2 passes.
- [x] 8.4 [designer] Write `src/lib/components/layout/header/header.svelte.test.ts`, rendering with a `ClerkAuth` in context and the props `pathname` and `liveHref`:
  - the wordmark links to `/`
  - signed out shows Sign in and no member links
  - Sign in is disabled when `loadError` is set
  - signed in, the avatar button's accessible name contains the profile name
  - the menu's Account calls `openUserProfile`, Sign out calls `signOut`, and Support links to Ko-fi with `target="_blank"`
  - the pill renders with `liveHref` and is absent when null
  - no markup references `storage.ko-fi.com`
    Verify it fails before 8.5.
- [x] 8.5 [designer] Rewrite `src/lib/components/layout/header/header.svelte`:
  - wordmark, `Link`s hidden below `sm`
  - Sign in (`auth.signIn()`)
  - avatar `Dropdown` with Account / Support / Sign out
  - live-game pill linking `liveHref` with the game name
  - remove the header Ko-fi link
    Verify 8.4 passes.
- [x] 8.6 [designer] Write `src/lib/components/layout/dock/dock.svelte.test.ts`: it renders all `NAV_ITEMS` with the current item marked via `pathname`, and has the `sm:hidden` class. Verify it fails before 8.7.
- [x] 8.7 [designer] Implement `src/lib/components/layout/dock/dock.svelte` (icons and labels, safe-area bottom padding) and `index.ts`. Verify 8.6 passes.
- [x] 8.8 [designer] Write `src/lib/components/layout/footer/footer.svelte.test.ts`: internal link hrefs are exactly the `NAV_ITEMS` hrefs, plus one Ko-fi link with `rel="noopener noreferrer"`. Verify it fails before 8.9.
- [x] 8.9 [designer] Implement `src/lib/components/layout/footer/footer.svelte` and `index.ts`. Verify 8.8 passes.
- [x] 8.10 [designer] Write `src/lib/components/layout/page/page.svelte.test.ts`:
  - `Page` renders children, and the `sidebar` snippet after them inside the `lg:grid-cols-[minmax(0,1fr)_18rem]` grid only when given
  - `Page` with a `title` renders exactly one `h1` with the title, plus the optional description and actions
    Verify it fails before 8.11.
- [x] 8.11 [designer] Implement `src/lib/components/layout/page/page.svelte` with its `index.ts`. Verify 8.10 passes.
- [x] 8.12 [designer] Write `src/lib/components/ui/meta/meta.svelte.test.ts`:
  - `title="Leaderboard"` gives the document title `Leaderboard · twoplay`
  - no title gives `twoplay`
  - the description, `og:title`, `og:description`, `og:type`, and `og:image` tags are in `document.head`
    Verify it fails before 8.13.
- [x] 8.13 [designer] Implement `src/lib/components/ui/meta/meta.svelte` and `index.ts`. Verify 8.12 passes.
- [x] 8.14 [designer] Write `src/lib/components/ui/banner/banner.svelte.test.ts`: it has `role="alert"` with its message, and renders its action (the root layout passes Reload, calling `location.reload()`). Verify it fails before 8.15.
- [x] 8.15 [designer] Implement `src/lib/components/ui/banner/banner.svelte` and `index.ts`, export `Dock`, `Footer`, and `Page` from `src/lib/components/layout/index.ts`, and export `Link`, `Meta`, and `Banner` from `src/lib/components/ui/index.ts`. Verify 8.14 passes and `pnpm check` is clean.

## 9. Root layout [engineer]

- [x] 9.1 [engineer] In `src/routes/+layout.svelte`, call `setupPreferences()` and `setupToaster()`, and render `<ToastRegion>`. Verify `pnpm check`. Toaster and prefs behavior is covered by 4.1 and 6.3.
- [x] 9.2 [engineer] In `src/routes/+layout.svelte`, derive `isRoom = isGameRoomRoute(page.route.id)`:
  - `<main>`: `overflow-hidden` when `isRoom`, `overflow-y-auto overscroll-contain` otherwise
  - `<Footer>` inside `<main>` and `<Dock>` after it, only when not `isRoom` (tab bar also requires signed in)
    Classification is covered by 3.1. Verify live (13.7).
- [x] 9.3 [engineer] In `src/routes/+layout.svelte`, subscribe `api.models.rooms.index.active` with `() => (auth.isSignedIn ? {} : "skip")`, and pass `liveHref = liveGameHref(active.data, page.url.pathname)` and `pathname` to `<Header>`. `liveGameHref` is covered by 3.1. Verify live (13.6).
- [x] 9.4 [engineer] Render `<Banner>` (sign-in message, Reload action) between the header and `<main>` when `auth.loadError` is set, in `src/routes/+layout.svelte`. Verify live (13.9).
- [x] 9.5 [engineer] Reset `main.scrollTop = 0` in `afterNavigate` for non-`popstate` navigations, in `src/routes/+layout.svelte`. Verify live (13.7).

## 10. Routes, metadata, and motion [designer]

- [x] 10.1 [designer] Add `static/og.png` (1200x630), `static/icon-192.png`, `static/icon-512.png`, `static/icon-maskable-512.png`, `static/apple-touch-icon.png`, and `static/manifest.webmanifest` (name, `short_name`, `start_url: "/"`, `display: "standalone"`, dark `background_color` / `theme_color`, icons with one `purpose: "maskable"`). Verify with `jq` in 13.5.
- [x] 10.2 [designer] In `src/app.html`, add `link rel="manifest"`, `link rel="apple-touch-icon"`, and `meta name="theme-color"` with the dark `--background` hex. Verify in 13.5.
- [x] 10.3 [designer] Render `<Meta>` with a route-specific title and description in `src/routes/(games)/+page.svelte`, `src/routes/{play,lobby,history,leaderboard}/+page.svelte`, and `src/routes/(games)/{tictactoe,checkers}/[code]/[[round]]/+page.svelte` (title from `GAMES[type].name`). Verify 8.12 and 13.5.
- [x] 10.4 [designer] Make the wordmark glow keyframes in `src/routes/(games)/+page.svelte` and `.blob-float` in `src/lib/features/presence/mood/mood.svelte` run only under `prefers-reduced-motion: no-preference`, keeping the static colors. Verify live with reduced motion emulated (13.10) and that `mood.svelte.test.ts` passes.
- [x] 10.5 [designer] Replace the default `src/lib/assets/favicon.svg` with the twoplay SVG mark (cyan and pink seat discs on `#0a0a0a`, readable at 16px) and add `type="image/svg+xml"` to the `link rel="icon"` in `src/routes/+layout.svelte`. Verify in 13.5.

## 11. Page adoption logic [engineer]

- [x] 11.1 [engineer] Write `src/lib/components/layout/feed/edges.test.ts`:
  - content that fits gives `{top:false,bottom:false}`
  - at the top with overflow gives `{top:false,bottom:true}`
  - in the middle gives both
  - at the bottom within 1px gives `{top:true,bottom:false}`
    Verify it fails before 11.2.
- [x] 11.2 [engineer] Implement `feedEdges` in `src/lib/components/layout/feed/edges.ts`. Verify 11.1 passes.
- [x] 11.3 [engineer] Write `src/lib/features/core/play/copy-link.test.ts`: on a successful clipboard write, `copyLink(url, { clipboard, toaster })` writes the URL and shows "Link copied"; on rejection it shows an error toast saying the link couldn't be copied. Verify it fails before 11.4.
- [x] 11.4 [engineer] Implement `copyLink` in `src/lib/features/core/play/copy-link.ts`. Make `copyInviteLink` in `src/lib/features/core/play/play.svelte` call it with `getToaster()`, and remove the `copied` / `copiedTimeout` state and the "Copied" label. Verify 11.3 passes, `pnpm check` is clean, and live (13.10).

## 12. Page adoption markup [designer]

- [x] 12.1 [designer] Add cases to `src/lib/components/layout/feed/feed.svelte.test.ts` that stub `scrollHeight`/`clientHeight`/`scrollTop` and dispatch `scroll`: no fade class when the content fits, and a bottom-only fade at the top with overflow. Verify they fail before 12.2.
- [x] 12.2 [designer] Apply `feedEdges` in `src/lib/components/layout/feed/feed.svelte` on `scroll` and through a `ResizeObserver`, picking one of four literal `mask-image` classes with `cn()`. Verify 12.1 and the existing feed tests pass.
- [x] 12.3 [designer] Replace all 13 `text-[10px]` / `text-[11px]` with `text-caption` in `src/lib/components/layout/board/board.svelte`, `src/lib/features/core/history/history.svelte`, `src/lib/features/core/leaderboard/leaderboard.svelte`, and `src/lib/features/core/lobby/lobby.svelte`. Verify `rg 'text-\[1[01]px\]' src` prints nothing and `board.svelte.test.ts` passes.
- [x] 12.4 [designer] Wrap the content of `src/routes/{play,lobby,history,leaderboard}/+page.svelte` in `Page`. Replace a page's heading with `Page`'s `title` only where it is a plain title and subtitle in `src/lib/features/core/{lobby,history,leaderboard}`. Verify one `h1` per page live (13.7) and `pnpm check`.
- [x] 12.5 [designer] Use `EmptyState` for the empty list in `src/lib/features/core/history/history.svelte` and, if it is a direct swap, in `src/lib/features/core/lobby/lobby.svelte`. Verify 7.7 and live (13.7).
- [x] 12.6 [designer] Swap any remaining hand-rolled focus styles in the header, tab bar, and footer for the shared `Link` ring. Verify the keyboard focus scenarios live (13.10).
- [x] 12.7 [engineer] Share the tailwind-merge config with `tv()` through `$lib/utils/style` and switch the five `tv()` users to it; fix the carousel class typo `rounded-xltransition-[transform,opacity]` in `src/lib/features/core/play/play.svelte`. Verify `linkVariants({ layout: "stacked", current: false })` keeps `text-caption` and `text-muted-foreground`.
- [x] 12.8 [engineer] Fix the create-room redirect race that skips the invite screen: gate the active-room redirect in `src/lib/features/core/play/play.svelte` on the in-flight create through `activeRoomRedirect` in `active-room.ts`. Verify `active-room.test.ts` fails before the fix and passes after.
- [x] 12.9 [engineer] Fix the Tabs `binding_property_non_reactive` warning by making `buttons` `$state` in `src/lib/components/ui/tabs/tabs.svelte`. Verify `tabs.svelte.test.ts` passes and `pnpm check` shows no warning.

## 13. Navigation items [engineer] (parallel-safe)

- [x] 13.1 [engineer] In `src/lib/utils/navigation/routes/index.test.ts`, change the `NAV_ITEMS` case to expect hrefs `/play`, `/lobby`, `/history`, `/leaderboard`, and assert none is `/`. Verify it fails before 13.3.
- [x] 13.2 [engineer] Add a case to `src/lib/components/layout/dock/dock.svelte.test.ts`: no tab links to `/`. Keep the `NAV_ITEMS` and `sm:hidden` cases. Verify it fails before 13.3.
- [x] 13.3 [engineer] Remove the Home entry and the `House` import from `NAV_ITEMS` in `src/lib/utils/navigation/routes/index.ts`. Verify 13.1 and 13.2 pass and `pnpm check` is clean.

## 14. Navigation surfaces [designer]

- [x] 14.1 [designer] In `src/lib/components/layout/header/header.svelte.test.ts`:
  - replace "Support opens Ko-fi in a new tab" with: the avatar menu has exactly the menuitems Account and Sign out, and no link to `SUPPORT_URL`
  - the wordmark is the only link to `/`
  - signed in, the primary nav links equal the `NAV_ITEMS` hrefs and their `nav` has the `hidden` and `sm:flex` classes
    Verify it fails before 14.2.
- [x] 14.2 [designer] In `src/lib/components/layout/header/header.svelte`, remove the Support `DropdownItem` and the `KofiIcon` / `SUPPORT_URL` imports, and render `NAV_ITEMS` directly instead of `memberLinks`. Verify 14.1 passes.
- [x] 14.3 [designer] Rewrite `src/lib/components/layout/footer/footer.svelte.test.ts`:
  - no footer href equals `/` or any `NAV_ITEMS` href
  - exactly one external link, Support, to `SUPPORT_URL` with `target="_blank"` and `rel="noopener noreferrer"`
  - the copyright renders
  - remove the "marks the current page" case
    Verify it fails before 14.4.
- [x] 14.4 [designer] In `src/lib/components/layout/footer/footer.svelte`, remove the footer `nav`, the `Link` import, and the `pathname` prop, keeping Support and the copyright on one line. Drop `pathname` from `<Footer>` in `src/routes/+layout.svelte`. Verify 14.3 passes and `pnpm check` is clean.

## 15. Layout-shift audit and conventions [engineer] (parallel-safe)

- [x] 15.1 [engineer] Measure current layout shift before any fix, with no code edits. Use the observer in design.md D11 on `pnpm build && pnpm preview`:
  - page load of `/`, `/play`, `/lobby`, `/history`, `/leaderboard`, `/tictactoe/<code>`, and `/checkers/<code>` at 360x640 and 1280x800, signed in and signed out, in `browser-a`
  - three turn changes in a tic-tac-toe room and three in a checkers room, with `browser-a` and `browser-b` seated
  - the auth error banner (block `*/npm/@clerk/ui@1/dist/ui.browser.js`), the live-game pill appearing, and the "Link copied" toast
    Append one `AUDIT cls <case> <score> <top source nodes>` line per case to `openspec/changes/polish-app-shell/worklog.md`. This is the failing evidence for groups 16-19.
- [x] 15.2 [engineer] In `.agents/skills/twoplay/references/conventions.md` (Styling, next to the no-wrap rule), add a no-layout-shift rule: reserve slots for conditional UI, give changing numbers and labels fixed widths and tabular figures, size placeholders like the content they replace, overlay transient banners, animate only `transform` and `opacity`, and check with the `layout-shift` observer. Docs only. Verify with `pnpm format:check`.

## 16. Font and shell stability [engineer] (parallel-safe)

- [x] 16.1 [engineer] Write `src/routes/layout.css.test.ts` (server project). Read `src/routes/layout.css` with `node:fs` and assert:
  - an `@font-face` for `"Inter Fallback"` declares `size-adjust`, `ascent-override`, and `descent-override`
  - `--font-sans` is `"Inter Variable", "Inter Fallback", sans-serif`
    Verify it fails before 16.2.
- [x] 16.2 [engineer] In `src/routes/layout.css`, add the `Inter Fallback` `@font-face` (`src: local("Arial")` with the D11 overrides) and put it in `--font-sans`. Verify 16.1 passes and `pnpm build`.
- [x] 16.3 [engineer] In `src/routes/+layout.svelte`, import `@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url` and add `<link rel="preload" as="font" type="font/woff2" crossorigin href={...}>` to `<svelte:head>`. Verify `pnpm check` and in 25.11.
- [x] 16.4 [engineer] In `src/routes/+layout.svelte`, wrap `<Header>` and the `Banner` conditional in a `relative z-40 shrink-0` element so the banner positions against the header's bottom edge (with 17.2). Verify live (25.14).

## 17. Shell stability markup [designer] (parallel-safe)

- [x] 17.1 [designer] Add a case to `src/lib/components/ui/banner/banner.svelte.test.ts`: the `role="alert"` root has the `absolute`, `inset-x-0`, and `top-full` classes. Verify it fails before 17.2.
- [x] 17.2 [designer] In `src/lib/components/ui/banner/banner.svelte`, position the root `absolute inset-x-0 top-full` and give it an opaque background so it reads over page content. Verify 17.1 and the existing banner cases pass.
- [x] 17.3 [designer] Add cases to `src/lib/components/layout/header/header.svelte.test.ts`:
  - the auth control (avatar trigger or Sign in) is the last element of the header's last group
  - the live-game pill precedes it in that group, has `min-w-0`, and its label truncates without wrapping
    If they already pass, note in the task that the header needed no change and skip 17.4.
    Passed on first run: the header needed no change.
- [x] 17.4 [designer] Adjust `src/lib/components/layout/header/header.svelte` so 17.3 passes, keeping the pill growing into the free space between the groups. Verify 17.3 passes. Skipped: 17.3 passed without changes.
- [x] 17.5 [designer] Add a case to `src/lib/components/ui/toast/toast-region.svelte.test.ts`: the live region has the `fixed` class, and toast items carry no slide or zoom animation classes (opacity only). Verify it passes against the current `toast-region.svelte`; fix the component if it doesn't.

## 18. Page loading placeholders [designer]

- [x] 18.1 [designer] Write `src/lib/components/layout/feed/feed-skeleton.svelte.test.ts`: it renders `rows` (default 5) `Skeleton` rows at the `Tile` height inside a container with the `Feed` box classes (`w-full max-w-md min-h-0 flex-1`), all `aria-hidden`. Verify it fails before 18.2.
- [x] 18.2 [designer] Implement `src/lib/components/layout/feed/feed-skeleton.svelte`, export `FeedSkeleton` from `src/lib/components/layout/feed/index.ts` and `src/lib/components/layout/index.ts`. Verify 18.1 passes.
- [x] 18.3 [designer] Write `src/lib/features/core/lobby/lobby.svelte.test.ts`, mocking `convex-svelte` (`useQuery`, `useMutation`) and providing a `ClerkAuth` in context:
  - signed in with `rooms` or `activeRoom` loading renders `FeedSkeleton` and no `Playing`
  - with both loaded, `Playing` and the room list render together
    Verify it fails before 18.4.
- [x] 18.4 [designer] In `src/lib/features/core/lobby/lobby.svelte`, gate on both queries in one loading branch that renders `FeedSkeleton`, and move `Playing` into the loaded branch. Verify 18.3 passes.
- [x] 18.5 [designer] Write `src/lib/features/core/history/history.svelte.test.ts` with the same mocks: `history` or `activeRoom` loading renders `FeedSkeleton` and no `Playing`; both loaded render together. Verify it fails before 18.6.
- [x] 18.6 [designer] In `src/lib/features/core/history/history.svelte`, gate on both queries in one loading branch that renders `FeedSkeleton`. Verify 18.5 passes.
- [x] 18.7 [designer] Write `src/lib/features/core/leaderboard/leaderboard.svelte.test.ts` with the same mocks: while any of the three queries loads, a rating-card-sized skeleton (the card's `rounded-2xl p-6` box with three `Skeleton` lines) and `FeedSkeleton` render. Verify it fails before 18.8.
- [x] 18.8 [designer] Implement that loading branch in `src/lib/features/core/leaderboard/leaderboard.svelte`. Verify 18.7 passes.
- [x] 18.9 [designer] In `src/lib/features/core/play/play.svelte`, replace the active-room loading branch with the picker itself, laid out but `invisible` while `activeRoom` loads, and the `Spinner` in an `absolute inset-0` overlay inside the picker's `relative` outer container, so the box is the picker's by structure (no measured min height). Test first in `play.svelte.test.ts`. Verify `pnpm check` and live (25.12).
- [x] 18.10 [designer] In `src/lib/features/core/history/history.svelte`, render `Playing` after the `Feed` instead of above it, so an active room that appears live (started in another tab, worklog `AUDIT cls signed-in pill /history 1280x800`) shrinks the feed from the bottom instead of pushing it down. Test first in `history.svelte.test.ts`. Verify live (25.12).
- [x] 18.11 [designer] Lobby: render Playing after the feed so a live room doesn't push it. In `src/lib/features/core/lobby/lobby.svelte`, same treatment as 18.10. Test first in `lobby.svelte.test.ts`. Verify live (25.12).

## 19. Game-room stability [designer]

- [x] 19.1 [designer] Add cases to `src/lib/components/layout/board/board.svelte.test.ts`:
  - the status bar grid has `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` (content-sized center, 7rem rejected in D11)
  - rerendering from `{ type: "turn", player: 0 }` to `player: 1` leaves the center with identical content: the same child count, both arrows present, and only which arrow is `invisible` differs
  - player names have `truncate` and scores have `min-w-[2ch]` and `tabular-nums`
  - the round action button (Resign, Rematch, Go live, Play again, Abandon) has `w-28` and `sm:w-32`
  - the error slot exists with `h-5` when `footer.error` is null and shows the text when set
  - the default `--board-size` equals the exported `BOARD_SIZE`
    Verify they fail before 19.2.
- [x] 19.2 [designer] Implement the D11 turn-change changes in `src/lib/components/layout/board/board.svelte`: content-sized center column with identical content across turns, both-arrow `turnIndicator`, truncated names, fixed-width scores and action button, always-rendered error slot with an opacity fade, and `BOARD_SIZE` in the module script. Verify 19.1 and the existing board cases pass.
- [x] 19.3 [designer] Write `src/lib/components/layout/board/board-placeholder.svelte.test.ts`: an `h-12` status-bar slot, an `aspect-square w-(--board-size)` area holding a `Spinner` (role `status`), the footer row and round-line slots, and `--board-size` defaulting to `BOARD_SIZE`. Verify it fails before 19.4.
- [x] 19.4 [designer] Implement `src/lib/components/layout/board/board-placeholder.svelte` and export `BoardPlaceholder` from `src/lib/components/layout/board/index.ts` and `src/lib/components/layout/index.ts`. Verify 19.3 passes.
- [x] 19.5 [designer] Render `<BoardPlaceholder />` instead of `<Spinner size="lg" />` in the `room.isLoading` and `room.wrongGameType` branches of `src/lib/features/play/tictactoe/tictactoe.svelte` and `src/lib/features/play/checkers/checkers.svelte`. Verify `pnpm check`, both `game.svelte.test.ts` files, and live (25.13).
- [x] 19.6 [designer] Move the presence cursor with transform instead of left/top: in `src/lib/features/presence/cursor/cursor.svelte`, position each peer cursor with `transform: translate(...)` in container units and transition the transform, so cursor movement records no layout-shift entries. Update `cursor.svelte.test.ts` first.
- [x] 19.7 [designer] Review fixes: status bar. Content-sized center column `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` with identical turn content. Visually hidden turn and result text ("Alex's turn", "Your turn", "Alex won", "You won"). Arrows and Win/Loss are `aria-hidden`. Tests first in `board.svelte.test.ts`. The center layout is superseded by 19.12.
- [x] 19.8 [designer] Review fixes: `Tabs` focus ring. Drop the group's `overflow-hidden` and round the edge items so the outer `ring-3` shows in full. Test first in `tabs.svelte.test.ts`.
- [x] 19.9 [designer] Review fixes: `ToastRegion` takes `aboveDock`. `+layout.svelte` passes the same condition that renders the `Dock`, and below `sm` the region sits 1.5rem up without it. Test first in `toast-region.svelte.test.ts`.
- [x] 19.10 [designer] Review fixes: reduced motion. `motion-safe:` on the `Beacon` ping, the board turn arrows and the history "Playing" pulse. Tests first.
- [x] 19.11 [designer] Review fixes: the Sign in buttons on Play, History, Lobby and Leaderboard are disabled while `auth.loadError` is set, as in the header. Tests first in each `*.svelte.test.ts`.
- [x] 19.12 [designer] Status bar center: every status (Waiting, Turn with both arrows, Win · Loss, Draw) renders in one grid cell (`col-start-1 row-start-1`), and only the active layer is visible; the others are `invisible`. All layers are `aria-hidden`. A single `role="status"` visually hidden span reads the active status ("Waiting for an opponent", "Alex's turn", "You won", "Draw"). The auto center column is always as wide as the widest status, so names and scores stay put on Waiting → playing and on round end. Test first: across Waiting, Turn (both seats), Win (both seats) and Draw, the center keeps the same element structure and exactly one layer is visible.
- [x] 19.13 [designer] Disable the Sign in buttons in `tictactoe.svelte`, `checkers.svelte` and `src/routes/(games)/+page.svelte` while `auth.loadError` is set. Tests first in new `tictactoe.svelte.test.ts`, `checkers.svelte.test.ts` and `src/routes/(games)/page.svelte.test.ts`.
- [x] 19.14 Restructure components: layout holds regions only (dock, page with title); link, banner and meta move to ui

## 20. Player strip helpers [engineer] (parallel-safe)

- [x] 20.1 [engineer] Write `src/lib/components/layout/board/strips.test.ts` (server project), tables for:
  - `stripSeats`: `0 → { top: 1, bottom: 0 }`, `1 → { top: 0, bottom: 1 }`, `null → { top: 1, bottom: 0 }`
  - `stripLine(status, seat, myIndex)`: turn on the viewer's seat is `your-turn`; turn on another seat (seated or spectator) is `to-move`; the seat not to move is `score`; winner gives `won` / `lost`; draw gives `draw` on both; waiting gives seat 1 `waiting` and seat 0 `score`; closed waiting gives seat 1 `blank`
  - `ringSeat`: the turn seat for `turn`, null for `winner`, `draw`, and `waiting`
    Verify it fails before 20.2.
- [x] 20.2 [engineer] Implement `StripLine`, `stripSeats`, `stripLine`, and `ringSeat` in `src/lib/components/layout/board/strips.ts` (D12), importing `BoardStatus` as a type from `./board.svelte`, and export them from `src/lib/components/layout/board/index.ts`. Verify 20.1 passes and `pnpm check`.

## 21. Player strips [designer]

- [x] 21.1 [designer] In `src/lib/components/layout/board/board.svelte.test.ts`, add strip cases (each strip root carries `data-slot="strip"` and `data-seat`):
  - order: with `myIndex` 0, the strip before the board area is seat 1 and the one after is seat 0; with `myIndex` 1 the reverse; with `myIndex` null, seat 1 above and seat 0 below
  - the own strip has the "YOU" text and the "Change your emoji" button; the other strip has neither; a spectator sees neither in either strip
  - each strip holds its seat's mark (default `●`, or the `mark` prop) with `text-seat-N`
  - a clock of 65 000 ms renders `1:05` inside that seat's strip with `font-mono` and `tabular-nums`
  - the round controls row contains no clock, and it, "Round N of M", and the error slot follow the lower strip in document order
  - delete the status-bar cases that 19.1, 19.7, 19.10, and 19.12 added (content-sized center column, identical center content per turn, pulsing arrows, center layers, Win/Loss sides) and the old "status bar names both players" case
    Verify the new cases fail before 21.3.
- [x] 21.2 [designer] Add stability cases to the same file:
  - every strip root has `h-14` and `whitespace-nowrap`; the name has `min-w-0` and `truncate`
  - across `turn 0`, `turn 1`, `winner 1`, `draw`, and `waiting`, each strip's status line keeps the same child count and exactly one layer lacks `invisible`, with the text `stripLine` selects ("Your turn", "To move", "Won", "Lost", "Draw", "Waiting", or the score)
  - rerendering `turn 0` to `turn 1` changes only ring classes on the strips (`ring-seat-N` versus `ring-transparent`); both keep `ring-2`
  - exactly one element has role `status`, reading "Blair's turn" for `turn 1` with `myIndex` 0, and every strip label is inside an `aria-hidden` element
  - no emoji box renders outside the strips
  - `BOARD_SIZE` starts with `min(calc(100vw - 1.5rem)`
    Verify they fail before 21.3.
- [x] 21.3 [designer] Implement D12 in `src/lib/components/layout/board/board.svelte`: remove the status-bar row, `statusCenter`, `resultSide`, and the emoji columns; add a `playerStrip(seat)` snippet (emoji box, name, mark, "YOU" tag, stacked status line from `stripLine`, clock box with `font-mono`, `ring-2` with `ring-seat-N` or `ring-transparent` from `ringSeat`); place strips by `stripSeats(myIndex)`; keep one sr-only `role="status"` span with `statusText`; drop the clocks from the controls row; add optional `mark` to `BoardPlayer`; set `BOARD_SIZE` to the D12 width term and a height term that gives at least 300px at 360x640, with the arithmetic in its comment. Verify 21.1, 21.2, and the remaining board cases pass.
- [x] 21.4 [designer] Update `src/lib/components/layout/board/board-placeholder.svelte.test.ts`: an `h-14 w-(--board-size)` strip slot before and after the `aspect-square w-(--board-size)` area holding the `Spinner`, then the controls row, the round line, and the `h-5` error slot; no `size-10` emoji column. Verify it fails before 21.5.
- [x] 21.5 [designer] Rebuild `src/lib/components/layout/board/board-placeholder.svelte` to the 21.4 structure. Verify 21.4 passes.
- [x] 21.6 [designer] In `src/lib/features/play/tictactoe/tictactoe.svelte.test.ts`, assert the strips show the marks X and O; then pass `mark: markOf(0)` and `mark: markOf(1)` to the `Board` players in `src/lib/features/play/tictactoe/tictactoe.svelte`. `checkers.svelte` keeps the default mark. Verify the test, both `game.svelte.test.ts` files, `checkers.svelte.test.ts`, and `pnpm check`.
- [x] 21.7 [designer] Strip marks use the game's own glyphs: `Board` takes an optional `markIcon` snippet (`Snippet<[seat]>`) drawn `aria-hidden` in a fixed `size-3.5 shrink-0` box in the seat color, with `BoardPlayer.mark` as an sr-only label next to it. `tictactoe.svelte` moves the X and O shapes into a `markShape` snippet shared by the board's animated `mark` and a static `stripMark`, and passes `markIcon={stripMark}`. Checkers keeps the default disc. Tests first in `board.svelte.test.ts` and `tictactoe.svelte.test.ts` (seat 0's strip holds the same svg as the board's X cell, with an sr-only "X").
- [x] 21.8 [designer] Checkers strips show the board piece: `checkers.svelte` passes `markIcon={stripMark}`, a static disc with the piece's `rounded-full shadow-md` and `ACCENTS[seat].bg` (no drop-in, no sound), and `mark: "Player N pieces"` as the sr-only label. Board keeps the `●` fallback for callers without an icon. Test first in `checkers.svelte.test.ts`.

## 22. Member navigation on auth failure [engineer, designer] (parallel-safe)

- [x] 22.1 [engineer] Add cases to `src/lib/services/auth/client/clerk.svelte.test.ts`:
  - `hydrate(profile)` then a failed load: `isSignedIn` false, `serverSignedIn` true, `showsMemberNav` true
  - `hydrate(null)` then a failed load: `showsMemberNav` false
  - `hydrate(profile)`, a successful load, then a Clerk listener update with no user: `showsMemberNav` false
    Verify they fail before 22.2.
- [x] 22.2 [engineer] In `src/lib/services/auth/client/clerk.svelte.ts`, add `serverSignedIn` (set in `hydrate`) and the `showsMemberNav` getter (D13). Verify 22.1 and the existing cases pass.
- [x] 22.3 [engineer] Add a `showsDock` case table to `src/lib/utils/navigation/routes/index.test.ts`: false on `/(games)/tictactoe/[code]/[[round]]` whatever the flag, true on `/play` with the flag, false on `/play` without it. Verify it fails before 22.4.
- [x] 22.4 [engineer] Implement `showsDock(routeId, showsMemberNav)` in `src/lib/utils/navigation/routes/index.ts` (export from `$lib/utils/navigation`) and use `showsDock(page.route.id, auth.showsMemberNav)` for `showDock` in `src/routes/+layout.svelte`. Verify 22.3 passes and `pnpm check`.
- [x] 22.5 [designer] Add a case to `src/lib/components/layout/header/header.svelte.test.ts`: after `hydrate(profile)` and a failed load, the `Main` nav renders with the `NAV_ITEMS` links, Sign in is disabled and is the last element of the right group, and there is no avatar button. Verify it fails before 22.6.
- [x] 22.6 [designer] In `src/lib/components/layout/header/header.svelte`, render the primary `nav` on `auth.showsMemberNav`, keeping the avatar versus Sign in choice on `auth.isSignedIn`. Verify 22.5 and the existing header cases pass.
- [x] 22.7 [designer] Add cases to `src/lib/components/layout/header/header.svelte.test.ts`:
  - the auth control's parent is a slot (`data-slot="auth"`) with the same class list signed in (avatar trigger), signed out (Sign in), and after a failed load (disabled Sign in); it has a fixed width class, `shrink-0`, and `justify-end`, and is the last child of the right group
  - the right group has `flex-1`, `min-w-0`, and `justify-end`, and the live-game pill renders inside it before the slot
    Replace the 17.3 case that expects the auth control itself as the group's last element. Verify they fail before 22.8.
- [x] 22.8 [designer] In `src/lib/components/layout/header/header.svelte`, wrap the avatar trigger and Sign in in the fixed `data-slot="auth"` slot (D13; width fits the Sign in button) and make the right group `min-w-0 flex-1 justify-end`. Verify 22.7 and the existing header cases pass, and live (25.14, 25.16).

## 23. History active room [engineer, designer] (parallel-safe)

- [x] 23.1 [engineer] Write `src/lib/features/core/history/rooms.test.ts` (server project) for `withoutActiveRoom(rooms, activeCode)`: drops the room with that code and keeps the order of the rest; returns the same rooms for `null`, `undefined`, or a code not in the list. Verify it fails before 23.2.
- [x] 23.2 [engineer] Implement `withoutActiveRoom` in `src/lib/features/core/history/rooms.ts` (D14). Verify 23.1 passes.
- [x] 23.3 [designer] Add cases to `src/lib/features/core/history/history.svelte.test.ts`:
  - history with `ABCD` (active) and two finished rooms renders two rows, no `ABCD` row, and the Playing card for `ABCD`
  - history with only the active room renders the empty state and the Playing card
  - rerendering from no active room to `ABCD` active, with `ABCD` newly in history, leaves the row count unchanged
    Replace the existing case that expects the active row's "Playing" label. Verify they fail before 23.4.
- [x] 23.4 [designer] In `src/lib/features/core/history/history.svelte`, render `withoutActiveRoom(history.data, activeRoom.data?.code)`, drop the per-row `isActive` highlight, emblem `active`, and `Beacon`, and render the Playing card below the empty state when the filtered list is empty. Verify 23.3 and the existing history cases pass.

## 24. Game icon motion [designer] (parallel-safe)

- [x] 24.1 [designer] Write `src/lib/assets/icons/games/tictactoe.svelte.test.ts`: it renders an `aria-hidden` svg with the X group, and reading `tictactoe.svelte` with `node:fs`, the `animation:` declaration for `.tictactoe-x-wobble` sits inside `@media (prefers-reduced-motion: no-preference)` and nowhere else. Verify it fails before 24.2.
- [x] 24.2 [designer] In `src/lib/assets/icons/games/tictactoe.svelte`, move the `animation` declaration into `@media (prefers-reduced-motion: no-preference)` (D15). Verify 24.1 passes and live (25.16).
- [x] 24.3 [designer] Write `src/lib/assets/icons/games/checkers.svelte.test.ts` with a stubbed `window.matchMedia`: with `(prefers-reduced-motion: reduce)` matching, the svg has no `animate` element and still renders its three polygons and three circles at their resting `points`, `cx`, and `cy`; without it, the `animate` elements render. Verify the reduce case fails before 24.4.
- [x] 24.4 [designer] In `src/lib/assets/icons/games/checkers.svelte`, import `prefersReducedMotion` from `svelte/motion` and render each `<animate>` only when `!prefersReducedMotion.current` (D15). Verify 24.3 passes, `pnpm check`, and live (25.16).

## 25. Verification

Groups 1-12 were written when this was group 13, so their `(13.N)` references mean `25.N`. References in groups 15-19 were renumbered from `20.N` to `25.N`.

- [ ] 25.1 Run `pnpm test`. All convex, server, and client projects pass.
- [ ] 25.2 Run `pnpm check`. 0 errors and 0 warnings.
- [ ] 25.3 Run `pnpm format:check`. Clean.
- [ ] 25.4 Run `pnpm build`. Succeeds.
- [ ] 25.5 With `pnpm build && pnpm preview`:
  - `curl` `/`, `/play`, and `/leaderboard` and confirm the per-route `<title>`, description, `og:*`, the manifest link, the apple-touch icon, and `theme-color`
  - `curl` the manifest through `jq` for `name`, `short_name`, `start_url`, `display`, and the 192/512/maskable icons
  - confirm `og:image` returns 200 with an image content type
- [x] 25.6 Live QA, navigation, at 360px and 1280px in `browser-a`:
  - the wordmark goes home
  - `aria-current` is on the current link only
  - signed out shows Sign in and no member links
  - the avatar menu has only Account and Sign out, and both work
  - the live-game pill appears off-room and links to the room, and is hidden inside it
  - the tab bar shows only at 360px, has no Home tab, and is absent in `/tictactoe/<code>`
  - the header's primary links are not displayed at 360px and are displayed at 1280px
  - the footer shows Support and the copyright only, and Support opens Ko-fi in a new tab
  - at each width, no href is displayed twice across the header, tab bar, and footer
  - no request to `storage.ko-fi.com`
- [ ] 25.7 Live QA, layout, at 360px and 1280px:
  - `/history` scrolls to the footer with the header still visible
  - room routes have no page scroll and no footer
  - navigating between pages starts at the top
  - one `h1` per page
  - empty history shows the empty state
- [ ] 25.8 Live QA, turn alert, with `browser-a` and `browser-b` seated in one room. `browser-a` switches tabs and `browser-b` moves: `browser-a`'s title flashes "Your turn" and the chime plays, then stops and restores when the tab is focused. With `twoplay:prefs` set to `{"sound":false}` the title flashes with no chime, and a spectator gets no alert.
- [x] 25.9 Live QA, B11: block `*/npm/@clerk/ui@1/dist/ui.browser.js` and load `/play` signed in. The page renders, the alert banner with Reload shows, Sign in is disabled, the console has no unhandled rejection, and no query hangs. Unblocked, no banner shows.
- [x] 25.10 Live QA, accessibility and feedback:
  - with reduced motion emulated, the wordmark and mood blobs hold still
  - keyboard focus on a header link, a tab option, and a button shows a ring of at least 3:1 composited contrast
  - Tabs on `/play` respond to arrow, Home, and End keys
  - Copy link on `/play` shows a "Link copied" toast that is announced and disappears after about 3 s
- [ ] 25.11 With `pnpm build && pnpm preview`:
  - `curl /` and confirm a `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the latin Inter file, and that the file returns 200
  - with `browser-a`'s signed-in session cookie, `curl /lobby` and confirm the HTML contains the tab bar and the footer
  - `curl /tictactoe/<code>` and confirm it contains neither
- [x] 25.12 Live QA, page-load layout shift, with the D11 observer: every route, viewport, and auth state from 15.1 has a cumulative score of at most 0.01. Append `VERIFY cls <case> <score>` lines next to the 15.1 audit lines in `worklog.md`.
- [x] 25.13 Live QA, turn changes, with `browser-a` and `browser-b` seated: at least three turn changes in a tic-tac-toe room and three in a checkers room record zero layout-shift entries in both browsers; loading each room replaces the placeholder with no entry; the status bar, names, clocks, board, and footer controls keep their positions at 360x640 and 1280x800.
- [ ] 25.14 Live QA, transient UI, with the D11 observer: the auth error banner appearing (bundle blocked, signed out and signed in), the live-game pill appearing on `/history`, the "Link copied" toast, and returning to a tab after a turn alert each record zero layout-shift entries, including in the header. Re-run after groups 22 and 23.
- [ ] 25.15 Live QA, player strips, with `browser-a` (Alex) and `browser-b` (Blair) seated, at 360x640 and 1280x800, D11 observer running:
  - each browser shows the opponent's strip above the board and its own below, with "YOU", the seat mark in the seat color, the status line, and the clock in its own strip; the strip to move has the ring
  - at 360x640 each name element is at least `8ch` wide (`el.clientWidth >= 8 *` the width of a `0` in the same font) and the board is at least 300px wide with both strips as wide as it
  - at 1280x800 the strips sit above and below the board at its width
  - three turn changes and one round end (a win, then a draw or a resignation) in a tic-tac-toe room and in a checkers room record zero layout-shift entries in both browsers
  - loading each room replaces the placeholder with zero entries
  - a spectator (signed-out viewers can't join; skip and note it if no third account exists) sees seat 1 above and seat 0 below
    Append `VERIFY strips <case> <result>` lines to `worklog.md`.
- [ ] 25.16 Live QA, QA fixes, with the D11 observer:
  - signed in, `*/npm/@clerk/ui@1/dist/ui.browser.js` blocked, `/play` at 360x640: the tab bar stays, and no entry is recorded for the footer, the tab bar, the page content, the wordmark, or the primary links; at 1280x800 the header's primary links stay and Sign in sits at the trailing edge
  - unblocked, signing out from the avatar menu removes the tab bar and the header's primary links
  - signed in on `/history` at 1280x800 and 360x640, start a room in `browser-b`'s other tab (or `browser-a`'s second tab): no row is added to the list, the Playing card appears below it, and no entry is recorded for the list rows
  - with reduced motion emulated, the tic-tac-toe and checkers icons on `/play` hold still and are visible
  - the avatar ↔ Sign in swap (bundle blocked, signed in) at 360x640 and 1280x800 records no header entry and the auth slot keeps its rect
