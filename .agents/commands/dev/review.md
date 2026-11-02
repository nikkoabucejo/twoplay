---
description: Run the review panel (reviewer + security + designer as relevant) on the current diff, read-only
argument-hint: [base-ref, default: merge-base with main]
---

Review the current changes without modifying anything.

1. Base = `$ARGUMENTS` if given, else `git merge-base main HEAD`. Diff = `git diff <base>` (includes
   uncommitted work). If the diff is empty, say so and stop.
2. Spawn in one message: **reviewer** (always), **security** (if the diff touches `convex/`,
   `hooks.server.ts`, `services/auth`, or env), **designer** in review mode (if it touches `.svelte`
   or CSS). Give each the base ref and the active OpenSpec change id if one matches the branch.
3. Check each finding against the code yourself (`superspec-receiving-review`). Drop the ones that
   don't hold up and note why.
4. Report the merged findings, most severe first, as `path:line — issue → fix`. Then give one line
   per agent with its verdict. Don't fix anything unless the user asks.
