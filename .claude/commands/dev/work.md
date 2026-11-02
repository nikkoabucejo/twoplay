---
description: Agentic dev flow — triage → spec (OpenSpec) → implement → verify → review → archive → commit
argument-hint: <what to build or fix> | <existing-change-id> [--auto] [--no-commit]
---

# /dev:work — agentic development flow

Request: **$ARGUMENTS**

You are the **orchestrator**. You run the flow below phase by phase, delegate real work to the
project agents in `.claude/agents/`, and keep the user informed with one short line per phase
transition. You do not write feature code yourself, except for trivial one-line fixes in Phase 4.
Delegate everything else.

## Flags
- `--auto` — skip the plan-approval gate in Phase 2 (still stop on blocking questions or failures).
- `--no-commit` — stop after archiving; leave changes uncommitted.
- If the request is exactly an existing change id (`openspec list --json`), go to **Resume**.

## Ground rules
- **OpenSpec is the single source of truth.** Specs and plans live in `openspec/changes/<id>/`.
  There is no `superspec/` directory. SuperSpec skills (`.claude/skills/superspec-*`) supply the
  discipline.
- **State lives on disk**, so the flow can be resumed: `tasks.md` checkboxes plus
  `openspec/changes/<id>/worklog.md`. Append one line per phase:
  `- <ISO time> <PHASE> <result>`.
- **Agents report; you decide.** Treat agent output as claims. Re-check anything load-bearing with
  a quick command before acting on it (`superspec-verification`).
- **Loop limits.** At most 3 verify→fix loops and 2 review→fix rounds. If a limit is hit, stop and
  report exactly what is failing.
- **Never** push, force-push, rewrite history, run `convex deploy`, or touch `.env*`. Commits go to
  the feature branch only.

---

## Phase 0 — Preflight
1. Run `git status --short` and `git branch --show-current`. If the tree has uncommitted changes
   unrelated to this request, stop and ask how to proceed (stash, commit, or continue on top).
2. Run `openspec list --json`, and note active changes.
3. Echo: `▶ /dev:work — <request>` and the flags in effect.

## Phase 1 — Triage
Spawn **triage** with the request verbatim. Parse its report.
- `TYPE: question` → answer from its NOTES and stop.
- `BLOCKING_QUESTIONS` non-empty → ask the user (AskUserQuestion, at most 4 questions, with
  options) and pass the answers forward. Otherwise adopt its ASSUMPTIONS and say so in one line.
- `OVERLAPS` points to an active change → ask whether to extend that change or start a new one.
- Show the user: TYPE · SIZE · CHANGE_ID · RISKS · AGENTS.

## Phase 2 — Spec (skip if SIZE = trivial)
1. **large only.** Run the Explore and Propose phases of `.claude/skills/superspec-brainstorm/SKILL.md`
   yourself, in this conversation. Ask the user the 2–4 decisions that shape the design, compare
   2–3 approaches, and agree on one. Keep it short. Don't write artifacts here.
2. Spawn **architect** with the triage report, the user's answers, and any brainstorm decisions.
   It creates `openspec/changes/<CHANGE_ID>/` and must return `VALIDATE: pass`. If it fails, send
   the errors back once. If it still fails, stop.
3. Create `worklog.md` in the change folder with a header and the Phase 1–2 lines.
4. **Approval gate** (unless `--auto`): show the proposal summary, the requirement count, and the
   task groups with owners. List its OPEN_QUESTIONS with the assumptions taken. Ask:
   *Approve & build* / *Revise (tell me what)* / *Stop here (keep the spec)*. On *Revise*, send the
   feedback to architect and repeat the gate.

## Phase 3 — Branch
If on `main`, create and switch to `<COMMIT_TYPE>/<CHANGE_ID>` (e.g. `feature/add-connectfour`).
If already on a non-main branch, stay on it and say so.

## Phase 4 — Implement
- **trivial:** make the edit yourself (or spawn engineer/designer if it's more than a few lines),
  then run `pnpm check`. Skip to Phase 6 and treat the review as the light path.
- **small/large:** read `tasks.md`. For each task group, in order:
  - Pick the owner from the `[engineer]` / `[designer]` tags. If a group mixes both, run engineer
    first, then designer.
  - Spawn the owner with: the change id, the exact task ids to do, and the instruction to read
    proposal/design/specs first. Groups marked `(parallel-safe)` that touch disjoint files may run
    concurrently. Send those Agent calls in one message.
  - After each agent returns, check that its tasks are ticked in `tasks.md` and that
    `TASKS_BLOCKED` is empty. If a task is blocked by a design problem, stop and return to
    Phase 2 with architect. Don't improvise around it.
  - Append the result to the worklog.

## Phase 5 — Verify (skip for trivial; `pnpm check` from Phase 4 stands in)
Spawn **verifier** with the change id.
- `RESULT: fail` → send `FAILURES` plus the unproven scenarios to the owning agent (engineer by
  default, designer for markup-only failures). Bugs follow `superspec-debugging`. Then verify again.
  Max 3 loops.
- `UNEXPLAINED_CHANGES` → either justify them or revert those files (ask the user first if they
  predate this run).

## Phase 6 — Review
Get the diff base with `git merge-base main HEAD` (or the working tree for trivial changes). Spawn
in parallel, in one message:
- **reviewer** — always.
- **security** — if RISKS includes schema/auth/trust-boundary/clocks/mmr, or the diff touches
  `convex/`, `hooks.server.ts`, `services/auth`, or env handling.
- **designer** in review mode — if the diff touches `.svelte` markup or styles and SIZE ≠ trivial.

Then apply `.claude/skills/superspec-receiving-review/SKILL.md` to the findings. Verify each one
against the code. Accept it or reject it with a technical reason. Don't just agree.
- Accepted CRITICAL/HIGH/IMPORTANT findings go to the owning agent as fixes, then back through
  Phase 5. Max 2 rounds.
- MEDIUM/MINOR findings: fix them if they're cheap and in scope. Otherwise list them as follow-ups.
- A rejected finding is recorded in the worklog with the reason.

## Phase 7 — Finish
1. Final evidence: `openspec validate <id> --strict` and `pnpm check` must pass in this run. Quote them.
2. Archive: `openspec archive <id> --yes`. This merges the deltas into `openspec/specs/` and moves
   the change to `openspec/changes/archive/`. Skip this for trivial changes.
3. Commit, unless `--no-commit`. Stage only the files this flow changed plus the `openspec/`
   changes. The message follows the repo style:
   ```
   <COMMIT_TYPE>(<scope>): <summary>

   <2–4 lines: what and why; OpenSpec change id>

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
   Use the attribution line from the current system instructions if one is given.
4. Hand off with `superspec-finish-branch`. Offer to open a PR (`gh pr create`), merge locally, or
   leave the branch. Don't do any of these without a yes.

## Final report to the user
Keep it short. Include:
- What changed: files grouped by area, with links.
- Evidence: the validate, check, and build results, and scenarios proven out of the total.
- Review outcome: findings fixed, rejected with the reason, and deferred follow-ups.
- Where it is: branch, commit hash, and archived change path.
- Anything assumed or left undone, stated plainly.

## Resume (`/dev:work <existing-change-id>`)
Read `openspec status --change <id> --json`, `tasks.md`, and `worklog.md`. Find the first phase
that isn't complete: missing artifacts → Phase 2, unticked tasks → Phase 4, no passing verify
line → Phase 5, no review line → Phase 6, otherwise Phase 7. Say where you're resuming and continue.
