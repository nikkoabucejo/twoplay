---
description: Remove AI slop and convention drift from the current diff (behavior-preserving)
argument-hint: [base-ref, default: merge-base with main]
---

Spawn the **steward** agent in **conform** mode with base `$ARGUMENTS` (empty means it uses the merge-base
with `main`, or `HEAD` if there's no branch). It applies the `anti-slop` rules plus the twoplay
architecture and conventions to the changed lines only, without changing behavior, then runs `pnpm check`.

Relay its result to the user: what it removed or fixed (grouped), what it kept deliberately, any
ESCALATE items needing a decision, and the `pnpm check` line. Don't commit.
