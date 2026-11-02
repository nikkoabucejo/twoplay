# Architecture — where things go

## Stack
- SvelteKit (`adapter-auto`), Vite, Svelte 5 runes.
- Tailwind CSS v4 via `@tailwindcss/vite`. No `tailwind.config.js`; tokens live in
  `src/routes/layout.css` (`@theme inline { … }`): `--seat-0` / `--seat-1` (→ `text-seat-N`, `bg-seat-N`),
  `text-caption` (11px), and the metric-matched `"Inter Fallback"` `@font-face`. `app.html` hardcodes
  `class="dark"` and links the manifest, `theme-color`, and apple-touch-icon.
- shadcn-svelte (style `vega`, base `neutral`, Lucide icons), config in `components.json`.
- Convex backend in `convex/` (see `backend.md`). Clerk auth.
- TypeScript strict, `moduleResolution: "bundler"`, `rewriteRelativeImportExtensions: true`.

## Layout
```
src/
  app.html, app.d.ts, hooks.server.ts   # hooks: Clerk request auth → event.locals.auth
  lib/
    assets/icons/games/   # one inline-SVG component per game, flat barrel
    assets/icons/brand/   # third-party marks (KofiIcon)
    components/           # container — no barrel
      ui/                 # shadcn primitives + generic atoms (Emoji, Sparkle, Emblem, Tile, Playing,
                          #   Skeleton, Empty, Toaster/ToastRegion, Banner, Link, Meta…)
      layout/             # page regions only: board, dock, feed, footer, header, page
    utils/                # container — no barrel
      style/              # cn, tv, ACCENTS, SEAT_COLORS
      multiplayer/        # Room (abstract rune-backed base class)
      navigation/         # NAV_ITEMS, SUPPORT_URL, isGameRoomRoute, isCurrentPath, liveGameHref
      storage/            # preferences (PreferencesStore, localStorage key `twoplay:prefs`)
      sound/
    features/             # container — no barrel
      play/               # playable games (tictactoe, checkers, chess) + games.ts (GAMES registry)
      presence/           # cursor, mood, turn-alert
      core/               # page-level features: lobby, play, history, leaderboard
    services/
      auth/               # client/ + server/ split (see below)
  routes/
    +layout.svelte, +layout.server.ts, layout.css
    (games)/+page.svelte                      # home / game picker
    (games)/<game>/[code]/[[round]]/+page.svelte
    play/, lobby/, history/, leaderboard/     # each renders Meta + Page around its features/core counterpart
static/                   # manifest.webmanifest, og.png, app icons
convex/
  schema.ts, auth.config.ts, crons.ts         # wiring only
  models/<name>/{schema.ts,index.ts,…}        # all domain logic
```

## Root layout
`src/routes/+layout.svelte` keeps one `h-dvh overflow-hidden` frame with the absolute `Mood` layer,
then switches on `isGameRoomRoute(page.route.id)` (a `[code]` segment, not the `(games)` group):
- Game room: `<main>` is `overflow-hidden` and its children fill the height. No footer or dock.
- Other routes: `<main>` scrolls (`overflow-y-auto`), `Footer` is last inside it, and `Dock`
  (the mobile tab bar: signed in, `sm:hidden`) follows it. `afterNavigate` resets `main.scrollTop`.
- A `Banner` (sign-in message, Reload action) overlays below the header when `auth.loadError` is set. `ToastRegion` is fixed.
- The root layout sets up the context stores: `setupMood`, `setupClerkAuth`, `setupPreferences`, `setupToaster`.

Navigation: the wordmark is the only link to `/`. `NAV_ITEMS` (Play, Lobby, History, Leaderboard)
render in the header from `sm` and in the `Dock` below it. The footer holds Support only. The avatar
menu holds actions (Account, Sign out). Each destination has one surface per width.

Pages: each route renders `Meta` (title, description, `og:*`). `/play`, `/lobby`, `/history`, and
`/leaderboard` wrap content in `Page`, which renders the single `h1` from `title` (with `description`,
`actions`, and `titleClass`; `/play` passes `titleClass="sr-only"`).

## The category rule
`components/`, `utils/`, `features/`, `services/` are containers of categories. Every leaf is exactly
one category deep, and code imports at the **category** level:

- `import { Button } from "$lib/components/ui"` — not `$lib/components`, not `…/ui/button`.
- The **category folder owns the barrel** (`features/play/index.ts`). No root barrels.
- Add a new category folder when a leaf doesn't fit an existing one.

## Barrels and exports
- Every leaf is a **folder with `index.ts`** (never a bare `.ts` in a category). Simple utils may put
  the implementation in `index.ts` itself (`utils/style/cn/index.ts` *is* `cn`).
- Components: single-file (`button/button.svelte`) or multi-part (`tooltip/tooltip-trigger.svelte`…),
  each with its own `index.ts`.
- **No `export *`.** `export { cn } from "./cn/index.js";`
- Components re-export flat (`Tooltip`, `TooltipTrigger`), not namespaced `Tooltip.Root`.
- Within a feature/component folder use relative imports; cross areas with a `$lib/<container>/<category>` alias.

## Client/server split
`services/auth/` has `client/` (browser-safe Clerk state) and `server/` (secret-holding Clerk
backend). The category `index.ts` re-exports **client only**. Server callers (`hooks.server.ts`,
`+layout.server.ts`) import `$lib/services/auth/server` by full path — the single sanctioned
deep import. Only split when there really is secret-holding code.

## ui vs layout vs feature
- `components/ui/` — presentational, takes content via props/snippets, no domain state. Don't
  hand-restructure shadcn-generated parts. `Playing` is a known exception (stateful); don't copy it.
- `components/layout/` — structural components shared by **multiple** features (`Board`, `Feed`,
  `Header`, `Page`). Domain-agnostic: `Board` never imports a `GameType`.
- Used by only one feature → it lives inside that feature.

## Recipes
- New util: `utils/<category>/<name>/index.ts` + line in `utils/<category>/index.ts`.
- New ui/layout component: `components/<category>/<name>/<name>.svelte` + `index.ts` + category barrel line.
- New hook: `$lib/hooks/<name>.svelte.ts` re-exported from `hooks/index.ts` (create on first use).
- New game: see `games.md`.
- Mirror existing wiring: `style/cn`, `multiplayer/room`, `play/tictactoe`, `layout/board`,
  `core/lobby`, `presence/cursor`, `services/auth`.
