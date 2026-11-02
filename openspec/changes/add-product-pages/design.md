# Design

## Context

- Preferences live in `src/lib/utils/storage/preferences/preferences.svelte.ts`: `PreferencesStore` (one `sound` field, `setSound`), `parsePreferences`, and `setupPreferences()` called from the root layout. The only reader is `TurnAlert` (`features/presence/turn-alert`), which gates the chime on `preferences.sound`.
- `src/lib/utils/sound/index.ts` is a module-level `AudioContext`. `playMoveSound`, `playCaptureSound`, and `playTurnChime` connect straight to `ctx.destination`. `tictactoe.svelte` and `checkers.svelte` call them with no preference check, so today the sound toggle mutes only the chime.
- Reduced motion is read in many ways: `motion-safe:` classes (`Skeleton`, `Beacon`, `history`, `Board`), `@media (prefers-reduced-motion)` blocks (`mood.svelte`, landing page, `emblem.svelte`, `leaderboard.svelte`, game icons), `matchMedia` in `board.svelte`, and `svelte/motion` `prefersReducedMotion` in the checkers icon.
- Existing queries: `ratings.mine` (rating number), `ratings.top` (top 100 with `isMe`), `rooms.stats` (`totalGames`, `wins`, `winRate`), `rooms.history` (`RoomHistoryEntry[]` with `type`, `opponentName`, per-round `result`, `mmr`, `createdAt`). None gives rank or a per-game record directly.
- The tic-tac-toe engine (`convex/models/games/tictactoe/engine.ts`) does not use the classic send-to-board rule. Its rule is that a player can't play the board they played last turn unless no other board is open (`lastBoardBySymbol`, `hasOtherPlayableBoard`). The rules page follows the engine.
- Checkers (`convex/models/games/checkers/rules.ts`, `engine.ts`): men move forward diagonally, kings both ways. Captures are mandatory, a capturing piece continues while it can capture (also right after crowning), and the side with no legal move loses.
- `polish-new-game` (B) runs in parallel, owns `features/core/play`, and makes the first preferences edit: a private full-object `#write()`, a `lastPlay` field, and `setLastPlay`. This change's preferences work starts after B's group 1 lands.
- `src/lib/utils/seo/index.ts` holds `INDEXED_PATHS` (`/`, `/play`), which drives `isIndexable` (used by `Meta`) and `sitemapXml`.

## Goals / Non-Goals

**Goals:**

- Volume and sound preferences silence or scale every sound, including game moves, without editing the game components.
- "Always reduce" disables CSS motion app-wide without editing the components that use it.
- Preferences fields can be added by another change with append-only edits.

**Non-Goals:**

- Play page reading the new-game defaults (owned by `polish-new-game`).
- JS-driven motion in unowned files (`board.svelte` `matchMedia`, `prefersReducedMotion` in `assets/icons/games/checkers.svelte`, Svelte transitions).
- Server-side rank or per-game record queries.

## Decisions

### 1. Preferences: per-field validators, one generic setter

Builds on B's `#write()` (the only writer, serializing the full object). `Preferences` grows flat fields: `volume` (0–1), `turnAlert` (boolean), `motion` (`"system" | "reduce"`), `newGameOpponent` (`"matchmaking" | "public" | "private"`), `newGameClock` (`3 | 5 | 10`). Each gets a default, a validated line in `parsePreferences` (per-field fallback), a `$state` on `PreferencesStore`, an entry in `#write()`, and a setter (`setVolume`, `setTurnAlert`, `setMotion`, `setNewGameOpponent`, `setNewGameClock`) that assigns and calls `#write()`. No second writer.

- Alternative: a nested `newGame: { opponent, clock }` object. Rejected: nested validation and partial fallback need their own code, and `polish-new-game`'s "last used" field would want to sit beside it anyway.
- Alternative: a generic `set(key, value)` with a validator table. Rejected: B introduces `#write()` and named setters first, and a second write path would drift.

`newGame*` are the user's chosen defaults and stay separate from B's `lastPlay`. B decides which one the Play page uses first. Both changes add lines to the type, defaults, parse, `#write()`, and store; neither rewrites the other's lines.

### 2. Sound: a master gain configured from preferences

`utils/sound` gains `configureSound({ isEnabled, volume })` and a master `GainNode` created with the context. All three play functions connect to the master instead of `ctx.destination` and return early, without creating an `AudioContext`, when disabled or at volume 0. `setupPreferences()` registers an `$effect` (it runs during root-layout init) that calls `configureSound` from the store. The effect body lives in an exported `applyPreferences(store, deps)` so it is testable with fakes under `$effect.root`.

- Alternative: check preferences in each caller. Rejected: the callers (`tictactoe.svelte`, `checkers.svelte`) are off-limits and any future sound would need to remember.
- Alternative: `utils/sound` reads the preferences context. Rejected: it is called from event handlers outside component init, where `getContext` fails.

`TurnAlert` keeps its own `preferences.sound` check (now redundant but harmless) and adds `turnAlert`.

### 3. Reduced motion: a root class honored by CSS

`applyPreferences` toggles `reduce-motion` on `document.documentElement` when `motion === "reduce"`. `src/routes/layout.css` overrides Tailwind's `motion-safe` and `motion-reduce` with `@custom-variant` so `motion-safe` also requires no `.reduce-motion` ancestor and `motion-reduce` also matches under it. A global rule under `.reduce-motion` sets `animation-duration`, `animation-iteration-count`, and `transition-duration` to their minimum with `!important`, which covers the component `@media` blocks too.

- Alternative: replace every reduced-motion check with a shared util. Rejected: most of those files are off-limits for this change. Listed as a follow-up.

The class is applied on hydration, since preferences are in `localStorage`. A user who forces reduction may see the first animation frames of a server-rendered page. Fixing that needs an inline script in `app.html`, which this change doesn't own.

### 4. Stats page derives rank and per-game record on the client

`features/core/stats` holds pure functions tested in isolation: `rankOf(top)` (index of `isMe` + 1, or `null`), `recordByGame(history)` (win/loss/draw per `GameType`, skipping `playing`), and `recentRounds(history, 10)` (flattened rounds, newest first, with `href`). The component reads `ratings.mine`, `ratings.top`, `rooms.stats`, and `rooms.history` with `"skip"` when signed out.

- Alternative: add a `ratings.rank` or `rooms.recordByGame` query. Rejected: the brief keeps Convex untouched, and the data is already on the client.

### 5. Rules content keyed by `GameType`

`features/core/rules` exports `RULES: Record<GameType, GameRules>` (sections with heading, body, and an optional diagram id) so a new game fails type-checking until it has rules. Names, icons, and colors come from `GAMES`. Diagrams are small inline SVG or CSS grids using `seat-N` tokens. `src/routes/how-to-play/[game]/+page.ts` checks the param against `GAMES` and throws `error(404)` otherwise.

### 6. Indexing

The rules, About, Privacy, and Terms routes are appended to `INDEXED_PATHS` as literal paths, so `Meta` renders their canonical link and `sitemapXml` lists them. `/me`, `/settings`, and error responses stay out. The game slugs are written out rather than derived from `GAMES`, because `utils` can't import `features`; a test checks every `GameType` has its `/how-to-play/<game>` entry.

- Alternative: a prefix rule (`/how-to-play/*`). Rejected: an unknown slug such as `/how-to-play/chess` 404s and must not get a canonical link.

### 7. Placement

New page features go under the existing `features/core` category (`rules`, `stats`, `settings`) with lines appended to `features/core/index.ts`, matching `lobby`, `history`, `leaderboard`. About, Privacy, and Terms are static markup in their routes with no feature folder. Footer links are a local list in `footer.svelte`. Avatar menu items use `DropdownItem` with navigation to `/me` and `/settings`.

### Trust boundary

No Convex code changes. `/me` uses existing queries that call `requireUser(ctx)` and return only the caller's data (`ratings.top` returns public leaderboard rows plus an `isMe` flag). No room-membership check is involved. Preferences are browser-local and never sent to the server.

## Risks / Trade-offs

- [Two changes edit `Preferences` at once] → Append-only lines, distinct field names, and the `FIELDS` table. Resolve merge conflicts by keeping both lines.
- [New-game defaults are saved but unused until `polish-new-game` reads them] → Called out in the proposal and handed to that change. The preference contract (field names, allowed values) is fixed here.
- [Forced reduced motion misses JS-driven motion] → CSS covers most motion. Follow-up for `board.svelte`, the game icons, and Svelte transitions.
- [Rank only covers the top 100] → Players outside it see "Unranked".
- [Global animation reset can break code that waits on `animationend`] → Durations are set to 0.01ms rather than `none`, so end events still fire.
- [Edits outside the first brief: `layout.css`, `turn-alert.svelte.ts`, `utils/seo`] → Approved by the orchestrator. `features/core/index.ts` gets append-only barrel lines.
- [Group 1 depends on B's `#write()`] → Group 1 starts only after B's group 1 is merged into the working tree.
