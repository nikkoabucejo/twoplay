---
name: twoplay-convention
description:
  Coding-style conventions for twoplay — formatting, naming, rune usage
  patterns, class shape, comment style, and styling helpers (cn, ACCENTS,
  tailwind-variants). Use when writing or reviewing code for consistency, not
  when deciding where a file belongs (that's twoplay-architecture).
---

# twoplay Conventions

This is the "how to write it" reference, as opposed to `twoplay-architecture` ("where it goes").
For the game-feature recipe see `twoplay-game`; for the Convex data model see `twoplay-database`.

## Formatting (enforced by Prettier — don't fight it, don't hand-format)

- Tabs, not spaces (`useTabs: true`).
- Double quotes banned — `singleQuote: false` still means Prettier's default of double quotes for
  JS/TS; **use double quotes**.
- No trailing commas (`trailingComma: "none"`).
- `printWidth: 100`.
- `prettier-plugin-tailwindcss` auto-sorts Tailwind class strings — don't manually order utility
  classes, let the formatter do it.
- TypeScript strict mode; `rewriteRelativeImportExtensions: true` means every relative import ends
  in `.js`, even importing a `.ts`/`.svelte.ts` file (`./game.svelte.js`, `./types.js`).

## Rune-backed class pattern

State-holding logic lives in `.svelte.ts` files as a class, not a plain function/store. The
`Room`/`*Room` and `Mood`/`CursorPresence` classes are the reference shape:

- **Private fields use `#`** (real JS private fields, not `_`-prefixed convention) for anything not
  part of the public surface — `#kind`, `#getCode`, `#room`, `#play`, `#newGame` in `Room`.
- **`$state` for the mutable source of truth**, **`$derived`/`$derived.by` for anything computable
  from other state** — never hand-sync a second `$state` that mirrors a derivable value. `Room`'s
  `wrongGameType`, `isLive`, `game`, `round`, `players`, `scores` are all `$derived` off the one live
  query result (`#room`), not separately maintained.
  - Use `$derived.by(() => ...)` when the expression needs a block body or multiple steps; plain
    `$derived(...)` for a single expression.
- **`$effect` is for side effects only** — writing into a shared context (`mood.svelte.ts`'s
  `Board` → `Mood` write), subscribing/disposing, imperative work. Not for computing a value other
  code reads — that's what `$derived` is for.
- **Public getters over public fields** when the value is derived or needs to stay read-only from
  outside the class — `get isLoading()`, `get data()` in `Room` wrap the private query object rather
  than exposing it directly.
- **`protected` methods for subclass-only API** — `Room.submitMove`/`Room.getCode` are `protected`,
  called by `TictactoeRoom`/`CheckersRoom` but not exposed to component code holding a `Room`
  reference.
- Constructor parameters that need to stay reactive are **functions returning the value**
  (`getCode: () => string`, `getRound: () => number | undefined`), not the value itself — this is
  how a rune-backed class stays reactive to a caller's changing prop/state without the class itself
  needing runes wired through props. Give these sensible defaults where optional
  (`getRound: () => undefined = () => undefined`).

## Comments — why, not what

Default to no comments. When you do write one, it explains something the code can't: a non-obvious
constraint, an invariant, or a workaround. Every comment in this codebase reads this way — e.g. the
`ACCENTS` doc comment explains *why* literal Tailwind strings are required (the scanner needs
verbatim class names) and references the specific bug it replaced (`Board`'s `dotClass` string
concatenation), not what the array contains. The `Room` class doc comment explains the *split of
responsibility* between the base class and subclasses, not a restatement of its method list. Match
this: if removing the comment wouldn't confuse a future reader, don't write it.

## Styling helpers

- **`cn(...)`** (`$lib/utils/style`) — the standard `clsx` + `tailwind-merge` composer. Use it
  whenever conditionally combining class strings; don't hand-write ternary class concatenation.
- **`ACCENTS`** (`$lib/utils/style`) — the two seats' color identity as **complete literal Tailwind
  class strings** (`{ text: "text-cyan-500", bg: "bg-cyan-500", winBg: "bg-cyan-500/25" }`). Never
  derive one variant from another via string manipulation (`.replace("text-","bg-")`,
  template-literal class building) — Tailwind's scanner only generates CSS for class strings it
  finds verbatim in source, so a computed string can silently produce an ungenerated class. Consume
  `ACCENTS[seatIndex].text/.bg/.winBg` directly.
- **`tailwind-variants` (`tv(...)`)** for component variants, not `cva` — see `Button`/`Spinner` for
  the pattern (a `base` string with shared a11y-relevant classes like `focus-visible:ring-3` and
  `aria-invalid:*`, then `variants`/`sizes` maps).

## Types

- **Feature-local types re-export the server's inferred types** rather than redefining a shape the
  server already owns — e.g. a game's `types.ts` re-exports `Cell` from the matching
  `convex/models/games/<game>/rules.ts` and derives client-only aliases (`Board = Cell[]`) locally.
  Don't hand-write a parallel type that can drift from the Convex validator.
- Discriminated unions carry an explicit `kind: v.literal("...")` (server) / string literal (client)
  tag — always switch/narrow on `kind`, never on structural duck-typing.

## Naming

- **Boolean-typed values are prefixed `is`/`has` (or `should`/`can` where those read better)** so the
  name signals its type on its own — `isSignedIn` (`clerk.svelte.ts`), `isLive`/`isMyTurn`/`isOver`
  (`room.svelte.ts`, `game.svelte.ts`), `isOver` on `GameStatus` (`convex/models/games/engine.ts`).
  Applies to `$state`/`$derived`, props, and plain params alike — not just locals. Existing
  unprefixed booleans like `Room`'s `wrongGameType` or `lobby.svelte`'s `creating`/`copied` predate
  this convention; don't copy them for new code, and rename in passing if you're already touching
  the declaration.
- A `*Room` class name matches its game (`TictactoeRoom`, `CheckersRoom`); a `*Engine` object name
  matches its game (`tictactoeEngine`, `checkersEngine`). Follow this pattern for a new game rather
  than inventing a different suffix.
- Seat/player identity is generic and index-based at the shared-component layer (`players[0]`,
  `scores[0]`, seat `0`/`1`) — only a specific game or the `ACCENTS` array maps an index to a
  domain-specific label (`X`/`O`, cyan/pink). Don't hardcode a per-value name (`playerCyan`) where an
  index or `ACCENTS[index]` lookup is generic and reusable across games.
