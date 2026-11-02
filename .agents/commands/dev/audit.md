---
description: Audit the codebase (or an area) for architecture, convention, naming, slop, and docs drift
argument-hint: [area path, e.g. src/lib/features or convex/models/rooms]
---

Spawn the **steward** agent in **audit** mode, scoped to `$ARGUMENTS` (or all of `src/` and `convex/`
if empty). Read-only.

Then report to the user:
1. Findings by category (architecture, conventions, naming, anti-slop, docs drift), most severe first,
   as `path:line — issue → fix`, with effort.
2. Proposed batches: quick fixes the steward can apply in conform mode, refactors that each deserve
   their own `/dev:work` change, and doc fixes it can apply in knowledge-sync mode.
3. Any convention the references don't cover yet, with the steward's proposed rule.

Don't apply anything until the user picks a batch.
