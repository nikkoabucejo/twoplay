# Architecture — where things go

## Stack
- SvelteKit (`adapter-auto`), Vite, Svelte 5 runes.
- Tailwind CSS v4 via `@tailwindcss/vite`. No `tailwind.config.js`; tokens live in
  `src/routes/layout.css` (`@theme inline { … }`). `app.html` hardcodes `class="dark"`.
- shadcn-svelte (style `vega`, base `neutral`, Lucide icons), config in `components.json`.
- Convex backend in `convex/` (see `backend.md`). Clerk auth.
- TypeScript strict, `moduleResolution: "bundler"`, `rewriteRelativeImportExtensions: true`.

## Layout
```
src/
  app.html, app.d.ts, hooks.server.ts   # hooks: Clerk request auth → event.locals.auth
  lib/
    assets/icons/games/   # one inline-SVG component per game, flat barrel
    components/           # container — no barrel
      ui/                 # shadcn primitives + generic atoms (Emoji, Sparkle, Emblem, Tile, Playing…)
      layout/             # app-structural shared components (board, feed, header)
    utils/                # container — no barrel
      style/              # cn, ACCENTS
      multiplayer/        # Room (abstract rune-backed base class)
      sound/
    features/             # container — no barrel
      play/               # playable games (tictactoe, checkers) + games.ts (GAMES registry)
      presence/           # cursor, mood
      core/               # page-level features: lobby, play, history, leaderboard
    services/
      auth/               # client/ + server/ split (see below)
  routes/
    +layout.svelte, +layout.server.ts, layout.css
    (games)/+page.svelte                      # home / game picker
    (games)/<game>/[code]/[[round]]/+page.svelte
    play/, lobby/, history/, leaderboard/     # each renders its features/core counterpart
convex/
  schema.ts, auth.config.ts, crons.ts         # wiring only
  models/<name>/{schema.ts,index.ts,…}        # all domain logic
```

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
  header). Domain-agnostic: `Board` never imports a `GameType`.
- Used by only one feature → it lives inside that feature.

## Recipes
- New util: `utils/<category>/<name>/index.ts` + line in `utils/<category>/index.ts`.
- New ui/layout component: `components/<category>/<name>/<name>.svelte` + `index.ts` + category barrel line.
- New hook: `$lib/hooks/<name>.svelte.ts` re-exported from `hooks/index.ts` (create on first use).
- New game: see `games.md`.
- Mirror existing wiring: `style/cn`, `multiplayer/room`, `play/tictactoe`, `layout/board`,
  `core/lobby`, `presence/cursor`, `services/auth`.
