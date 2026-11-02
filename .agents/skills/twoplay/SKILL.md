---
name: twoplay
description:
  Project knowledge for twoplay (SvelteKit + Svelte 5 runes + Tailwind v4 + shadcn-svelte + Convex +
  Clerk real-time two-player games). Load before writing, planning, or reviewing any code in this
  repo — it says where files go, how they're exported, coding conventions, the Convex data model and
  trust boundaries, and the recipe for adding a game. Read only the reference file(s) you need.
---

# twoplay — project knowledge

Read the reference that matches the work. Each is self-contained.

| Need to… | Read |
|---|---|
| Decide where a file goes, how to barrel/export/import it | `references/architecture.md` |
| Write code in house style (formatting, runes, naming, styling helpers) | `references/conventions.md` |
| Touch Convex: schema, queries/mutations, auth, trust boundaries | `references/backend.md` |
| Add or change a game (server engine + client Room + Board) | `references/games.md` |
| Know why a convention exists, or record a new one | `references/decisions.md` |
| Avoid or remove AI slop | the `anti-slop` skill |

## Ten rules that cover most mistakes

1. **Server is the authority.** Every Convex mutation authenticates via `ctx.auth` (helpers in
   `convex/models/rooms/auth.ts`) *and* authorizes against the specific room. Client moves are
   proposals; engines re-validate.
2. **Category rule.** `components/`, `utils/`, `features/`, `services/` hold categories, not code.
   Leaves sit one category deep; import at the category level (`$lib/features/play`).
3. **Every leaf is a folder with `index.ts`.** No `export *` — list named exports explicitly.
4. **Relative imports end in `.js`**, even for `.ts` / `.svelte.ts` sources.
5. **`$derived` for anything computable, `$effect` only for side effects.** State logic lives in
   rune-backed classes in `.svelte.ts` with `#private` fields.
6. **Booleans are `is`/`has`/`should`/`can`-prefixed.**
7. **Tailwind classes are literal strings.** Use `cn()` to combine; never build class names by
   string manipulation (see `ACCENTS`).
8. **Client types re-export server-inferred types** — never hand-copy a Convex shape.
9. **Comments explain why, not what.** Default to none.
10. **Prettier owns formatting** (tabs, double quotes, no trailing commas, width 100).

## Verification commands

```bash
pnpm test           # vitest: convex, server, client projects
pnpm check          # svelte-kit sync + svelte-check (types) — must be 0 errors / 0 warnings
pnpm format:check   # prettier
pnpm build          # vite production build
pnpm dev            # convex dev + vite dev (only when a live run is needed)
```

Tests are colocated: `<module>.test.ts`, `<component>.svelte.test.ts`. Convex helpers are in `convex/test.setup.ts`.

The `steward` agent owns these files. If a reference disagrees with the code, the code wins. Fix the
reference in the same change, which `/dev:work` does in its knowledge-sync step.
