---
name: twoplay-architecture
description:
  Canonical reference for twoplay's folder structure, barrel/export conventions,
  and path aliases. Use when deciding where a new file belongs, how to export
  it, or auditing whether existing code follows the layout (components, utils,
  features, services, routes).
---

# twoplay Architecture

twoplay is a SvelteKit + Svelte 5 (runes) + Tailwind CSS v4 + shadcn-svelte + Convex real-time
multiplayer game project. This skill is the structural reference — where files go and how they're
exported. For coding-style conventions (naming, rune patterns, comments) see `twoplay-convention`.
For the game-feature recipe see `twoplay-game`. For the Convex data model see `twoplay-database`.

## Stack

- **SvelteKit** (`@sveltejs/kit`, `adapter-auto`), Vite, Svelte 5 (runes).
- **Tailwind CSS v4** via `@tailwindcss/vite`; no `tailwind.config.js` — theme tokens live in
  `src/routes/layout.css` (`@theme inline { ... }`).
- **shadcn-svelte** (style `vega`, base color `neutral`, Lucide icons) — config in `components.json`.
- **Convex** backend under `convex/` (see `twoplay-database`).
- **TypeScript** strict, `moduleResolution: "bundler"`, `rewriteRelativeImportExtensions: true` —
  relative imports use `.js` extensions even though the source is `.ts`.

## Folder structure

```
src/
  app.d.ts            # SvelteKit ambient types
  app.html            # hardcodes class="dark" — no light-mode toggle exists
  hooks.server.ts     # Clerk request authentication (populates event.locals.auth)
  lib/
    assets/
      icons/games/    # per-game inline-SVG icons — flat barrel, no folder-per-icon
    types.d.ts        # shared ambient types (WithElementRef, WithoutChild, …)
    components/       # container of component categories — no barrel at this level
      ui/             # shadcn-svelte primitives (button, spinner, tooltip, …)
      layout/         # app-specific structural components (board, feed)
    utils/            # container of util categories — no barrel at this level
      style/          # cn (class merge), ACCENTS (seat color identity)
      multiplayer/    # Room — the abstract multiplayer-room base class
    features/         # container of feature categories — no barrel at this level
      play/           # playable games (tictactoe, checkers, …)
      presence/       # live multiplayer presence UI (cursor, mood)
      core/           # room lifecycle pages (lobby, play, history) — one per top-level route
    services/         # container of service categories — no barrel at this level
      auth/           # split into client/ and server/ — see below
  routes/
    +layout.svelte / +layout.server.ts / layout.css   # app root
    (games)/          # route group: app shell (nav, ambient mood background)
      +page.svelte          # home/game-picker
      <game>/+page.svelte           # per-game lobby (create/join room)
      <game>/[code]/[[round]]/+page.svelte   # the room/round view; [[round]] optional
```

Path aliases (`components.json`): `$lib`, `$lib/components`, `$lib/components/ui`, `$lib/utils`,
`$lib/hooks`. `layout`, `features`, `services`, `multiplayer` have no dedicated alias — they resolve
under `$lib`, so import at the **category** level: `$lib/components/layout`, `$lib/features/play`,
`$lib/services/auth`, `$lib/utils/multiplayer`. Exception: `$lib/services/auth/server` must be
imported by its full sub-path, never the category alias (see "Client/server split").

## The category rule (one layer deep)

`components/`, `utils/`, `features/`, and `services/` are **containers of categories** — they hold
no code and no barrel of their own. Every leaf lives exactly **one category layer deep**, and code
imports at the **category** level — never the container root, never a deep leaf path.

- `components/<category>/<component>/` → `import { … } from "$lib/components/<category>"`
  (categories today: `ui`, `layout`).
- `utils/<category>/<leaf>/` → `import { … } from "$lib/utils/<category>"`
  (`style` holds `cn`/`ACCENTS`; `multiplayer` holds `Room`).
- `features/<category>/<feature>/` → `import { … } from "$lib/features/<category>"`
  (`play` holds `tictactoe`/`checkers`; `presence` holds `cursor`).
- `services/<category>/<leaf>/` → `import { … } from "$lib/services/<category>"`, except a
  server-only leaf (see below).

The **category folder owns the aggregating barrel** (`components/ui/index.ts`,
`utils/style/index.ts`, `features/play/index.ts`, …). There is no root barrel and no placeholder
file at the container level — a flat root re-export would risk name collisions across categories.
Add a new category folder when a leaf doesn't fit an existing one.

## The barrel pattern

Every leaf is a **folder with an `index.ts` barrel**, never a bare `.ts` file sitting directly in a
category. One concern per file; the leaf's `index.ts` re-exports its public surface, and the
category barrel re-exports each leaf.

- **utils**: each helper is a folder-with-index. Simple helpers put the implementation directly in
  `index.ts` (`utils/style/cn/index.ts` *is* `cn`).
- **components**: each component is its own folder with a per-component `index.ts`. May be
  **single-file** (`button/button.svelte`) or **multi-part** (`tooltip/` with `tooltip-trigger.svelte`,
  `tooltip-content.svelte`, …).
- **features**: each feature is self-contained with its own barrel; keep everything a feature needs
  (ui, logic, types) inside its folder.
- **hooks**: reusable hooks live in `$lib/hooks` (alias exists) as `.svelte.ts` files re-exported
  from `hooks/index.ts` — created on demand.

### Export rules

1. **No `export *`** (with or without `as`) — always list named exports explicitly.
   - ✅ `export { cn } from "./cn/index.js";`
   - ❌ `export * from "./button/index.js";`
2. **Relative re-exports use `.js` extensions**, even though the source is `.ts`.
3. **Components are re-exported flat as their component identity** (`<Button>`, not
   `<Button.Root>`). A per-component `index.ts` may export both the raw parts (`Root`, `Trigger`,
   `Content`) and flat prefixed aliases (`Tooltip`, `TooltipTrigger`); higher barrels re-export the
   flat names.
4. Adding a new export = adding one explicit line to the relevant barrel(s).

### Import rules

- **Cross-area: alias at the category level, not the file** — `$lib/components/ui`,
  `$lib/components/layout`, `$lib/utils/style`, `$lib/features/play` — not a container root
  (`$lib/components`) and not a deep leaf path (`$lib/features/play/tictactoe`).
- **Within a feature/component folder: relative imports** with `.js` extensions
  (`./game.svelte.js`, `./types.js`). Only reach for an alias crossing into another area.

## Client/server split (`services/`)

A `services/` category can split into **`client/` and `server/` sub-leaves** when its code touches
an env boundary. `services/auth/` is the reference: `client/clerk.svelte.ts` holds browser-safe auth
state, `server/clerk.server.ts` holds the secret-holding Clerk backend client. SvelteKit forbids
importing `$env/static/private` from anything client-reachable, so:

- The category's `index.ts` (`services/auth/index.ts`) is a **client-safe barrel only** — re-exports
  `./client/index.js`, never anything from `./server`.
- Server-only callers (`hooks.server.ts`, `+layout.server.ts`) import `$lib/services/auth/server`
  **directly by its sub-leaf path** — the one sanctioned exception to "always import at the category
  level."

Only split a category when it actually has secret-holding code — don't split preemptively.

## Layout vs. ui components

- **`components/ui/`** — shadcn-svelte primitives, plus generic presentational atoms
  (`Emoji`, `Sparkle`, `Emblem`, `Tile`) that take their content via typed props/snippets rather than
  reading domain state. Don't hand-restructure the shadcn-generated ones. `Emblem` is the
  domain-agnostic icon+color badge (`icon: Component`, `colors: [string, string]`) a caller derives
  from `GAMES[type]` — it never takes a `GameType` itself. `Tile` is the highlighted list-item card
  (`highlighted`, `icon`/`title`/`subtitle`/`trailing`/`children` snippets) — no domain coupling at
  all, even though its only current callers are `Lobby`/`History`. `Playing` is the one deliberate
  exception: it's a stateful, connected component (constructs a live `TictactoeRoom`/`CheckersRoom`
  from `$lib/features/play`) rather than a presentational atom, but lives here rather than
  `components/layout/` because it composes `Emblem`/`Button`/`Emoji` directly as ui-tier building
  blocks. Don't use it as precedent for putting other connected/stateful components in `ui/`.
- **`components/layout/`** — app-specific structural components shared across multiple features:
  `Board` (status bar + play-area slot + round-nav footer — reports its status into the ambient
  background via `features/presence/mood`'s `getMood()`) and `Feed` (the scrollable list container,
  shared by the `Lobby`/`History` features under `features/core/`). They define and export shared
  types/props features consume (`BoardPlayer`, `BoardStatus`, `BoardFooter`, `FeedProps`) — a layout
  component itself stays domain-agnostic, taking content only via snippets/typed props, the same way
  `Board` never imports a `GameType`.
- A component used by only **one** feature is not a layout component — it belongs inside that
  feature's own folder (or, like `Lobby`/`History`/`Play`, as its own feature under
  `features/core/`), not under `components/layout/`.

## When adding things

- **New game/feature**: `features/play/<game>/` with `index.ts`, `<game>.svelte`, `game.svelte.ts`
  (a `*Room` extending `$lib/utils/multiplayer`'s `Room`), `types.ts`. See `twoplay-game` for the
  full recipe including the server half.
- **New util**: `utils/<category>/<name>/index.ts`, re-exported from `utils/<category>/index.ts`.
- **New ui component**: `components/ui/<name>/<name>.svelte` (+ part files if multi-part) and its
  `index.ts`, re-exported from `components/ui/index.ts`.
- **New layout component**: same shape under `components/layout/<name>/`.
- **New service touching secrets**: split into `client/`/`server/`, keep `index.ts` client-safe.
- **New hook**: `hooks/<name>.svelte.ts`, re-exported from `hooks/index.ts` (create it if it's the
  first).

When in doubt, mirror how `style/cn`, `style/accents`, `multiplayer/room`, `play/tictactoe`,
`layout/board`, `core/lobby`, `presence/cursor`, `services/auth`, `button`, and `tooltip` are
wired.
