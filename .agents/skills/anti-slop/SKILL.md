---
name: anti-slop
description:
  Rules against AI-generated code slop in twoplay, and a "deslop" pass that removes it from a
  diff. Applies to ALL code an agent writes — load it before writing code (write-time rules) and
  run the deslop pass before reporting work done. Covers noise comments, defensive code on trusted
  paths, type escapes, overbuilding, drive-by changes, Svelte 4-isms and rune misuse, Tailwind
  string-building, Convex anti-patterns, and AI-sounding UI copy.
---

# Anti-slop

Slop is code that runs but that a senior engineer on this repo would never have written. It costs
review time, hides real bugs behind noise, and makes the codebase read as generated. The test for
every line: **would a careful human on this team have written exactly this, here?**

Two modes:
- **Write-time.** Follow the rules below while writing. This is cheaper than cleaning up afterwards.
- **Deslop pass.** Review the diff against its base, remove slop, and keep behavior identical.

## Write-time rules

### 1. Comments
Default to none. A comment earns its place only by saying something the code can't: a
constraint, an invariant, a workaround, a security or concurrency note, or a "why not the obvious way".
Remove:
- Restating code (`// increment count`, `// User class`, `// return the result`).
- Narration (`// Step 1: validate`, `// First…`, `// Now we…`, `// Finally…`).
- Banners and labels (`// ===== HELPERS =====`, `// Main logic`, `// Event handlers`).
- Signature-echo JSDoc (`@param code The code.`).
- Vague TODOs (`// TODO: improve`, `// could optimize later`). A TODO must name a concrete task.
- End markers (`} // end if`), decorative emoji, ALL-CAPS shouting.
- Change-log comments (`// Updated to use X`, `// Fixed bug`, `// New:`). That belongs in git.
- Over-explained notes. One line, two at most. Drop the history and the reasoning chain.

Keep, and keep short: why-comments of the kind already in this repo (the `ACCENTS` note about
Tailwind's scanner, the `rooms/auth.ts` note about circular imports).

### 2. Defensive code on trusted paths
- No `try/catch` that only logs and rethrows, swallows, or wraps a call that can't throw. Errors
  surface where a caller can act on them. In this repo that's the `Room` methods that set `error`.
- No re-checking what a Convex validator already guarantees (`typeof args.code === "string"` after
  `v.string()`), and no re-checking a value the previous line just produced.
- No `?? ""` / `?? 0` / `|| []` fallbacks that turn a bug into a silent wrong value. Throw, or handle
  the real `null` state the UI must show.
- No optional chaining on values the types say are present (`room?.players` when `room` was just
  checked).
- No `if (!x) return;` guards for states that cannot occur. Real loading and empty states stay.

### 3. Type escapes
No `any`, `as any`, `as unknown as T`, `@ts-ignore`, or `@ts-expect-error` without a one-line reason.
No `!` non-null assertions to quiet the checker, and no `v.any()`. Fix the type, narrow on `kind`,
or re-export the server-inferred type.

### 4. Overbuilding
- No single-use helpers, wrappers, factories, "manager"/"service" classes, or config options nobody
  asked for. Inline them until a second caller exists.
- No new files unless the architecture requires a new leaf (see `twoplay` architecture), and no
  new dependencies unless asked.
- No speculative generality: generic type params with one instantiation, `options` objects with
  one field, enums for two literals that already exist as a union.
- No stubs, placeholders, `// not implemented`, or mock data left in.
- Don't duplicate an existing helper. Search first (`cn`, `ACCENTS`, `requirePlayer`,
  `getRoomByCode`, `Room` methods, `GAMES`).

### 5. Scope creep
- No drive-by renames, reformatting of untouched lines, import reordering, or "while I'm here"
  refactors. Prettier owns formatting.
- No unrelated file edits. Every changed line traces to the task.
- Leave nothing dead: unused imports, variables, props, exports, or commented-out code.

### 6. Svelte 5 slop
- Svelte 4 syntax in new code: `export let`, `$:`, `on:click`, `<slot>`, `createEventDispatcher`,
  `$$props`, stores for local state. Use `$props()`, `$derived`, `onclick`, snippets, and callback props.
- `$effect` that computes a value (`$effect(() => { total = a + b })`). That should be `$derived`.
- `$state` that mirrors something derivable, and `$state` + `$effect` "sync" pairs.
- Destructuring reactive values out of a class or props in a way that loses reactivity.
- `onMount` + manual subscription where the `Room` / `useQuery` pattern already handles it.
- Wrapper components that only forward props to one child.

### 7. Tailwind / UI slop
- Class names built by string manipulation or template literals. Use literal strings and `cn()`.
- Inline `style=` for things Tailwind tokens cover. Scattered arbitrary values (`w-[347px]`,
  `text-[13.5px]`) where a scale value exists.
- Hand-rolled buttons, inputs, or popovers when `components/ui` has one.
- Gratuitous effects with no precedent in the app (gradient text, glows, bounce animations).
- AI-sounding copy: "Oops! Something went wrong 😅", "Seamlessly…", "Let's get started!",
  exclamation-heavy or emoji-laden labels. Match the app's existing terse, plain tone.

### 8. Convex slop
- `.filter()` scans where an index exists or should exist. Unbounded `.collect()` on growing tables.
- `try/catch` around `ctx.db` calls, and writing then throwing (Convex rolls back the whole handler).
- Returning whole documents when the client needs two fields. Leaking other users' rows.
- `console.log` debugging left in queries or mutations.
- Hand-written types that duplicate a validator. Use `Infer<typeof …>`.

### 9. Naming slop
`data`, `result`, `temp`, `item2`, `handleClick2`, `myFunction`, `newX` / `oldX`, `helper`, `utils` as
names. Unprefixed booleans. A second name for an existing concept. Hungarian or suffix noise
(`roomObj`, `playersArray`, `isLoadingBool`).

### 10. Test slop
- Tests that restate the implementation, assert mocks were called, or snapshot whole objects instead of
  checking behavior.
- Mocking the unit under test, or mocking what convex-test already provides (db, auth, scheduler).
- One giant test per function. Use one behavior per `test`, named as the behavior (`"join rejects a full room"`).
- Re-implementing helpers that `convex/test.setup.ts` already has (`setup`, `signIn`, `seatedRoom`).
- `expect(true).toBe(true)`, assertion-free tests, `any`-typed fixtures, sleeps instead of fake timers.
- Deleting or loosening a test to make it pass. A failing test either exposes a bug (fix the code, or mark
  it `test.fails` with a one-line reason) or the test is wrong.

## Deslop pass (procedure)

1. Base: given, else `git merge-base main HEAD`, else `HEAD`. Diff: `git diff <base>` (includes uncommitted work).
2. Run the scanner for a first pass. It's read-only and prints flagged added lines:
   ```bash
   bash .agents/skills/anti-slop/scan.sh [base]
   ```
   Treat its output as leads, not verdicts. It can't see intent.
3. Read every changed hunk against sections 1–9, and judge each against the **surrounding file's**
   style, not an abstract ideal.
4. Fix in place with minimal edits. **Behavior must not change.** If removing something would
   change behavior (e.g. a guard that turns out to be load-bearing), keep it and say why in one line.
5. Touch only lines in the diff. Pre-existing slop elsewhere is a note for the `steward`, not a
   drive-by fix.
6. Run `pnpm check`. It must still show 0 errors and 0 warnings. Format the changed files with
   `pnpm exec prettier --write <files>`.
7. Report in 1–3 sentences: what was removed, and anything deliberately kept.

## Credits
Synthesized for twoplay from the community deslop and anti-slop skills: Cursor's and Brian Lovin's
`deslop`, iCodeCraft's `kill-slop`, and miqdadbadjuber's `antislop-code`. Stack-specific sections
are original to this repo.
