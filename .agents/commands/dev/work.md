---
description: Orchestrated dev flow — triage → OpenSpec (route, plan, apply) → verify → archive → commit, every step a visible agent
argument-hint: <what to build or fix> | <existing-change-id> [--auto] [--no-commit] [--branch] [--push]
---

# /dev:work

Request: **$ARGUMENTS**

You are the orchestrator. OpenSpec plans and applies the change. Every step runs as a visible `Agent` call in
this conversation, never through the Workflow tool, so the user can see what is running. You handle the steps
that need the user (route, questions, approval) and git. The flow ends when the change is archived or the user
stops it. Process reference: `WORKFLOW.md`.

## Progress lines
- Before each agent call, print one line: `▸ <step> · <agent>: <what it does>`.
- After it returns, print one line: `✓ <step>: <result>` or `✗ <step>: <failure>`.
- Agents that run together are announced together. A loop iteration is its own line, e.g. `▸ verify 2/3 · verifier`.

## Flags
- `--auto`: take the recommended route and skip the approval gate.
- `--no-commit`: stop before committing.
- `--branch`: work on a new `<commitType>/<changeId>` branch. The default is the current branch.
- `--push`: run `git push` after committing. Never force-push.
- If the request is exactly an existing change id, go to **Resume**.

## 1. Preflight
1. Run `git status --short` and `git branch --show-current`. If there are uncommitted changes
   unrelated to this request, ask whether to stash, commit, or continue on top.
2. CodeGraph: if `.codegraph/codegraph.db` is missing, run `codegraph init -y`. Otherwise run `codegraph sync -q`.
3. Dev server for QA: if `curl -sf http://localhost:5173` fails, start `pnpm dev` with Bash `run_in_background`
   and wait until it responds (60 s max). If it won't start, continue: QA then reports `blocked`.
4. Print one line: `▶ /dev:work: <request> [flags]`.

## 2. Triage
1. Spawn `triage` with the request (and any earlier answers). It runs `codegraph sync -q`, locates the code with
   `codegraph_explore`, runs `codegraph impact` for each symbol likely to change, checks `openspec list --json` for
   overlaps, and returns: type, size, route, routeWhy, changeId, commitType, summary, areas, impact, risks,
   overlaps, blockingQuestions, assumptions, notes. It edits nothing.
2. Type `bug`: spawn `qa` in debug mode to reproduce it in the running app and collect console and network evidence (`repro`).
- Type `question`: answer from `notes`, then stop.
- With `repro`: show the reproduction steps and evidence.

## 3. Route
Show `triage.summary`, `size`, `risks`, and `impact`. Ask with AskUserQuestion which OpenSpec route to take,
with `triage.route` first, marked `(Recommended)`, and `routeWhy` as its description:

| Route     | When                                               | Skill                                                |
| --------- | -------------------------------------------------- | ---------------------------------------------------- |
| `none`    | Trivial. No behavior or data-model change.         | **Trivial path**                                     |
| `explore` | The problem or approach is unclear.                | `openspec-explore`, `superspec-brainstorm` 1–2       |
| `new`     | Large or risky. Review each artifact before the next. | `openspec-new-change`, then `openspec-continue-change` |
| `ff`      | Clear scope. All artifacts in one go.              | `openspec-ff-change`                                 |
| `propose` | Clear goal with blocking questions.                | `openspec-propose` (clarifies first)                 |

With `--auto`, take `triage.route` without asking. `explore` still needs the user.

### Polish lane
Offer it (recommended) when the request is UI, UX, copy, layout, accessibility, or performance polish with no
Convex, schema, auth, or game-rule change. It changes how steps 4–7 run:
- **Plan:** `ff` route. One short spec per capability, tasks at group level (one line per group), no per-artifact gate.
- **Owners:** one `designer` owns the whole area end to end. An `engineer` joins only for real logic.
- **Tests:** test-first for logic (helpers, stores, rules, auth) only. Markup and styling are proven by `pnpm check`,
  a screenshot pass, and live QA, not by tests that assert class names.
- **Feedback:** collect the user's notes and apply them in one round. A small visual ask is fixed directly by the
  area's owner, with no spec revision unless it changes a requirement.
- **Verify:** the parallel split from step 7, sized down. Use one commands `verifier` and one evidence `verifier`.
  The orchestrator measures layout shift with `.agents/scripts/layout-shift.mjs`; no agent clicks through it.
  Run one round of `qa` agents at the end, on the changed scenarios only, one agent per browser pair. Then one
  combined review: `reviewer`, plus `designer` in review mode. Skip the separate conform, impact, and sync agents;
  the reviewer covers conventions, and the steward runs only if docs changed.

## 4. Plan
Follow the chosen skill, using `triage.changeId` as the change name. Give it the triage brief: summary, areas,
impact, risks, assumptions, `blockingQuestions` (ask them first), and `repro`. Also:
- Every `impact` caller gets a task, or an "unaffected because" in design.md.
- For bugs, the first task is a failing test built from `repro`.
- `explore`: when the approach is settled, ask the route again (`new`, `ff`, or `propose`).
- `new`: after each artifact, show it and ask *Continue* / *Revise* until all artifacts exist.

Then run `openspec validate <id> --strict` until it passes, and append `- PLAN done` to
`openspec/changes/<id>/worklog.md`.

## 5. Approval gate (skipped with `--auto`)
Show the proposal, the requirement count, the `tasks.md` groups with their owners, the impact summary,
and the open questions. Ask: *Approve & apply* / *Revise* / *Stop (keep the change)*.
On *Revise*, follow `openspec-update-change`, validate, and gate again.

## 6. Apply
1. With `--branch`, create and switch to `<commitType>/<changeId>`.
2. Record the base: `git rev-parse HEAD`.
3. Follow `openspec-apply-change`. Hand each `## N.` group of `tasks.md` to its tagged owner (`engineer`,
   then `designer`). Consecutive `(parallel-safe)` groups run together. Each owner ticks its tasks.
4. If a task conflicts with the design, follow `openspec-update-change` with the conflict, gate again, and resume.
5. Append `- APPLY done` to `worklog.md`.

## 7. Verify
Run these in order, each as its own agent call, against the diff base from step 6. Treat each report as a
claim and re-check anything load-bearing with a quick command.

Split verification work so it runs in parallel. Never hand one agent everything. Spawn the parallel agents in one
message, give each a narrow brief and a time budget, and merge their reports.

1. **Verify** (max 3 loops). Spawn in parallel:
   - `verifier` (commands): `pnpm test`, then `pnpm check`, `pnpm format:check`, `pnpm build` and
     `openspec validate <id> --strict`. It also reports whether the diff touches UI (`.svelte`/CSS) or Convex/auth/env.
   - `verifier` (evidence), one per group of 2–4 capabilities: the openspec-verify-change checks
     (completeness, correctness, coherence; any CRITICAL is a failure) and evidence per scenario for its
     capabilities only. It reads code and tests and runs nothing else.

   On fail, spawn `engineer` with the merged failures (root cause, `superspec-debugging`), then re-run only the
   failing agents. Still failing after 3: stop and show the failures as-is.
2. **QA** (max 2 loops; skip only when no scenario is user-visible). Split the scenarios three ways:
   - **Scripted**: anything that needs no signed-in player. This covers signed-out page loads, layout-shift matrices,
     metadata, SSR HTML, and blocked-script cases. The orchestrator runs `node .agents/scripts/layout-shift.mjs`
     plus `curl`, which takes seconds. No agent is needed.
   - **Live**: spawn one `qa` agent per browser pair, in parallel, each with its own scenario slice and about a
     10-minute budget. Pair 1 is `browser-a` + `browser-b`; pair 2 is `browser-c` + `browser-d`. A pair is never
     shared by two agents. Accounts are in `WORKFLOW.md`.
   - **Skipped**: scenarios already proven by a test are not re-run live.

   On fail, spawn `engineer` to fix the root cause with a Vitest test that reproduces it, re-run step 7.1, then
   re-run only the failing QA slice. Still failing: stop and show the scenarios, repro, and suspect.
   `blocked` (no dev server, no sign-in): report the reason and continue.
3. **Conform.** Spawn `steward` in conform mode on the diff. Behavior unchanged.
4. **Impact.** Spawn `triage`: `codegraph sync -q`, list every changed exported symbol, and run `codegraph impact`
   on each. Return the callers outside the diff. Edits nothing.
5. **Review** (max 2 fix rounds). Spawn together, each given the impact list:
   - `reviewer`, always.
   - `security`, if the diff touches Convex, auth, or env, or risks include schema, auth, trust-boundary, clocks, or mmr.
   - `designer` in review mode, if the diff touches UI.

   For each critical, high, or important finding, spawn a general-purpose skeptic (all at once) to refute it
   against the code, defaulting to "not real". Show which findings were accepted and which were rejected, with
   the reason. If any are accepted, spawn `engineer` to fix them, re-run step 7.1, then repeat 7.4–7.5.
   Still unresolved after 2 rounds: show them and ask whether to fix manually, accept, or stop.
6. **Sync.** Spawn `steward` in knowledge-sync mode on the diff.

Append `- VERIFY done` to `worklog.md`, then go to step 8.

## 8. Archive and commit
1. Run `openspec validate <id> --strict`, `pnpm test`, and `pnpm check`. All must pass in this run.
2. Follow `openspec-archive-change`: confirm the artifacts and tasks are complete, then run
   `openspec archive <id> --yes`. This syncs the delta specs into `openspec/specs/` and moves the change to `archive/`.
3. Unless `--no-commit`: stage only the files this flow changed, then commit as
   `<commitType>(<scope>): <summary>`, with a short body that names the change id, and the
   attribution line from the system instructions.
4. With `--push`: run `git push`.

## Trivial path
Spawn `engineer` or `designer` for the edit, with a test where behavior changes. Then run
`bash .agents/skills/anti-slop/scan.sh HEAD`, `pnpm test`, and `pnpm check`, spawn `reviewer` on the diff, and commit per step 8.3. No OpenSpec change is made.

## Resume (`/dev:work <change-id>`)
Read `openspec status --change <id> --json`, `tasks.md`, and `worklog.md`. Missing artifacts: step 4 with
`openspec-continue-change`. Unticked tasks: step 6. All ticked without `VERIFY done`: step 7. Otherwise step 8.

## Report
Keep it short and factual:
- The route taken.
- Files changed, grouped by area.
- The test, check, build, and validate results, and scenarios proven out of the total.
- QA: scenarios passed in the browser, or `blocked` with the reason.
- What conform removed.
- Review findings: fixed, rejected, and minor.
- Which docs were synced.
- The commit hash.
- Anything assumed or left undone.
