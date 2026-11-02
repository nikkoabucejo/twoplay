# Conventions — how to write it

## Formatting (Prettier enforces it, so don't hand-format)
Tabs, double quotes, no trailing commas, `printWidth: 100`. `prettier-plugin-tailwindcss` sorts
class strings. Relative imports end in `.js`.

## Rune-backed classes (`.svelte.ts`)
Reference shapes: `Room` (`utils/multiplayer/room`), `TictactoeRoom`, `CheckersRoom`, presence classes.
- `#private` fields for anything off the public surface.
- `$state` for the source of truth. Use `$derived` or `$derived.by` for anything computable, and never mirror a derivable value in a second `$state`.
- `$effect` is for side effects only (subscriptions, writing into shared context, imperative work).
- Use public getters for read-only or derived values (`get isLoading()`, `get data()`).
- `protected` for subclass-only API (`submitMove`, `getCode`, `displayState`).
- Reactive constructor inputs are **functions** (`getCode: () => string`), with defaults when optional.

## Comments
Default to none. Write one only for a non-obvious constraint, invariant, or workaround. Explain
*why* (e.g. `ACCENTS` explains Tailwind's scanner needs literal class strings).

## Styling
- `cn(...)` from `$lib/utils/style` for conditional classes — no ternary string concatenation.
- `ACCENTS[seat].text / .bg / .winBg` — complete literal class strings. Never derive one from another.
- `tailwind-variants` (`tv`) for variants, not `cva` (see `Button`, `Spinner`).
- Accessibility: visible focus states (`focus-visible:ring-*`), labels/aria on interactive controls.

## Types
- Feature `types.ts` re-exports server-inferred types from `convex/models/games/<game>/…`.
- Discriminated unions carry `kind`. Narrow on `kind`, never by duck-typing.

## Naming
- Booleans: `is`/`has`/`should`/`can` prefix — state, derived, props, params. Older unprefixed ones
  (`wrongGameType`, `opponentDisconnected`) predate the rule. Rename in passing when touching them.
- `<Game>Room` classes, `<game>Engine` objects.
- Seats are generic indices (`0`/`1`, `players[i]`). Only a specific game or `ACCENTS` maps an
  index to a label. Never hardcode `playerCyan`-style names.
- One concept, one name end-to-end (DB field → server response → client → UI).

## Tests
- One test file per source file, same name, next to it: `index.ts` gets `index.test.ts`, `board.svelte` gets
  `board.svelte.test.ts`, and `room.svelte.ts` gets `room.svelte.test.ts`.
- Use one `describe` per export, in source order, and one behavior per `test`, named as the behavior.
- Never split one source file's tests across files. If a test file gets too big, split the source module,
  and the test splits with it.
- `x.svelte` and `x.svelte.ts` in the same folder share `x.svelte.test.ts`, with a `describe` per export.
- Barrels (re-export-only `index.ts`), `types.ts`, and `schema.ts` have no test.
- Code that calls `useQuery`/`useMutation` is tested with the fake in `src/lib/utils/multiplayer/room/fake-convex.svelte.ts`.
- Test what is defined where it is defined. `resign` lives in `games/index.ts`, so it is tested in `games/index.test.ts`.
- Known bugs are recorded as `test.fails("…", …)` with a one-line reason.

## Commit messages
`<type>(<scope>): <summary>` with type ∈ `feature`, `bug`, `chore`, `refactor`, `docs` — e.g.
`feature(leaderboard): add leaderboard`.
