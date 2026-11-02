---
description: Orchestrated dev flow — preflight → dev-plan workflow → approval → dev-build workflow → archive → commit
argument-hint: <what to build or fix> | <existing-change-id> [--auto] [--no-commit] [--branch] [--push]
---

# /dev:work

Request: **$ARGUMENTS**

You are the orchestrator. The heavy lifting runs in two saved workflows (`.agents/workflows/`):
`dev-plan` and `dev-build`. You handle the steps that need the user (questions, brainstorm, approval)
and the git and OpenSpec steps (archive, commit, push). The user invoking this command is opt-in to
running those workflows. Process reference: `WORKFLOW.md`.

## OpenSpec coverage
`/dev:work` runs the whole OpenSpec lifecycle. `/opsx:*` is never needed:
explore (brainstorm) → propose (architect) → update (revise) → apply (dev-build) → verify (verifier) → sync + archive (finish).

## Flags
- `--auto`: skip the approval gate.
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

## 2. Plan: run the `dev-plan` workflow
Call `Workflow({ name: "dev-plan", args: { request } })` and act on the `stage` it returns:
- `triaged`, type `question`: answer from `triage.notes`, then stop.
- `triaged`, size `trivial`: go to **Trivial path**.
- Any stage with `repro` (bugs): show the reproduction steps and evidence the `qa` agent collected.
- `needs-input`: ask `questions` with AskUserQuestion, then re-run with `args.answers`.
- `needs-brainstorm`: explore with the user, using the `openspec-explore` stance and `superspec-brainstorm` phases 1–2.
  Then re-run with `args.decisions` (the agreed approach, in a few lines).
- `planned`: go to step 3.

## 3. Approval gate (skipped with `--auto`)
Show `spec.proposal`, `spec.requirementCount`, the `spec.groups` with their owners, the `triage.impact`
summary, and the `spec.openQuestions`. Ask: *Approve & build* / *Revise* / *Stop (keep the spec)*.
On *Revise*, re-run `dev-plan` with `{ changeId, revise: <feedback> }`. That updates the change in place
(`openspec-update-change`), then gates again.

## 4. Build: run the `dev-build` workflow
1. With `--branch`, create and switch to `<commitType>/<changeId>`.
2. Record the base: `git rev-parse HEAD`.
3. Call `Workflow({ name: "dev-build", args: { changeId, groups: spec.groups, risks: triage.risks, base, qa } })`.
   `qa` is `false` only when no scenario is user-visible.
4. Act on `stage`:
   - `built`: go to step 5.
   - `blocked`: a task conflicts with the design. Show the detail, re-run `dev-plan` with
     `{ changeId, revise: <the conflict> }`, and gate again.
   - `verify-failed`: stop, and show `verify.failures` as-is.
   - `qa-failed`: stop, and show `qa.scenarios`, `qa.repro`, and `qa.suspect`.
   - `review-unresolved`: show `unresolved` and ask whether to fix manually, accept it, or stop.

## 5. Finish
1. Run `openspec validate <id> --strict`, `pnpm test`, and `pnpm check`. All must pass in this run.
2. Archive, following `openspec-archive-change`: confirm the artifacts and tasks are complete, then
   run `openspec archive <id> --yes`. This syncs the delta specs into `openspec/specs/` and moves the change to `archive/`.
3. Unless `--no-commit`: stage only the files this flow changed, then commit as
   `<commitType>(<scope>): <summary>`, with a short body that names the change id, and the
   attribution line from the system instructions.
4. With `--push`: run `git push`.

## Trivial path
Spawn `engineer` or `designer` for the edit, with a test where behavior changes. Then run
`bash .agents/skills/anti-slop/scan.sh HEAD`, `pnpm test`, and `pnpm check`, spawn `reviewer` on the diff, and commit per step 5.3. No OpenSpec change is made.

## Resume (`/dev:work <change-id>`)
Read `openspec status --change <id> --json` and `tasks.md`. If artifacts are missing, re-run `dev-plan`
with `changeId`. If tasks are unticked, run `dev-build` with the groups re-read from `tasks.md`.
If everything is done, go to step 5.

## Report
Keep it short and factual:
- Files changed, grouped by area.
- The test, check, build, and validate results, and scenarios proven out of the total.
- QA: scenarios passed in the browser, or `blocked` with the reason.
- What conform removed.
- Review findings: fixed, rejected, and minor.
- Which docs were synced.
- The commit hash.
- Anything assumed or left undone.
