---
description: Orchestrated dev flow — triage → OpenSpec (route, plan, apply) → verify → archive → commit
argument-hint: <what to build or fix> | <existing-change-id> [--auto] [--no-commit] [--branch] [--push]
---

# /dev:work

Request: **$ARGUMENTS**

You are the orchestrator. OpenSpec plans and applies the change. Two saved workflows (`.agents/workflows/`)
run the multi-agent work around it: `triage` before planning, and `verify` after apply. You handle the
steps that need the user (route, questions, approval) and git. The flow ends when the change is archived
or the user stops it. Invoking this command opts the user in to running those workflows. Process reference: `WORKFLOW.md`.

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

## 2. Triage: run the `triage` workflow
Call `Workflow({ name: "triage", args: { request } })`. It returns `{ triage, repro }`.
- Type `question`: answer from `triage.notes`, then stop.
- With `repro` (bugs): show the reproduction steps and evidence the `qa` agent collected.

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

## 7. Verify: run the `verify` workflow
Call `Workflow({ name: "verify", args: { changeId, risks: triage.risks, base, qa } })`.
`qa` is `false` only when no scenario is user-visible. Act on `stage`:
- `verified`: append `- VERIFY done` to `worklog.md`, then go to step 8.
- `verify-failed`: stop, and show `verify.failures` as-is.
- `qa-failed`: stop, and show `qa.scenarios`, `qa.repro`, and `qa.suspect`.
- `review-unresolved`: show `unresolved` and ask whether to fix manually, accept it, or stop.

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
