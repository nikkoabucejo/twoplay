# Workflow

Entry point: `/dev:work <request>`. The command orchestrates and OpenSpec plans and applies. Every step runs as a visible agent in the conversation, with a `▸` line when it starts and a `✓`/`✗` line when it ends. The Workflow tool is not used.

```
/dev:work
  1 Preflight       git state · codegraph init/sync · dev server
  2 Triage          triage → qa reproduce (bugs)
  3 Route           user picks the OpenSpec route (recommended one first)
  4 Plan            OpenSpec artifacts via the chosen route
  5 Gate            user approves the change (skipped with --auto)
  6 Apply           openspec-apply-change, task groups to engineer/designer
  7 Verify          Verify → QA → Conform → Impact → Review → Sync
  8 Archive         validate · archive · commit · push (--push)
```

The flow ends when the change is archived or the user stops it.

## Routes

| Route     | When                                                  | Skill                                                    |
| --------- | ----------------------------------------------------- | -------------------------------------------------------- |
| `none`    | Trivial. No behavior or data-model change.            | Trivial path, no OpenSpec                                |
| `explore` | The problem or approach is unclear.                   | `openspec-explore`, `superspec-brainstorm`, then a route |
| `new`     | Large or risky. Review each artifact before the next. | `openspec-new-change`, `openspec-continue-change`        |
| `ff`      | Clear scope. All artifacts in one go.                 | `openspec-ff-change`                                     |
| `propose` | Clear goal with blocking questions.                   | `openspec-propose`                                       |

`triage` recommends one. `--auto` takes it without asking.

**Polish lane.** For UI, UX, copy, layout, accessibility, and performance polish with no Convex, schema, auth, or rule change:

- `ff` route, with short specs and group-level tasks
- one `designer` owns the area
- tests for logic only
- feedback applied in one batch
- a scripted layout-shift check
- one `qa` run at the end
- one combined review

See `.agents/commands/dev/work.md`.

## OpenSpec lifecycle

| OpenSpec step  | Where in `/dev:work`             | Skill followed            |
| -------------- | -------------------------------- | ------------------------- |
| Plan           | Plan, by route                   | see Routes                |
| Update         | Gate → Revise, or a blocked task | `openspec-update-change`  |
| Apply          | Apply                            | `openspec-apply-change`   |
| Verify         | Verify → Verify                  | `openspec-verify-change`  |
| Sync + Archive | Archive                          | `openspec-archive-change` |
| Status         | `/dev:status`, Resume            | `openspec status`         |

`/opsx:*` commands remain available but are not needed.

## Triage (step 2)

| Phase     | Agent    | Output                                                                  |
| --------- | -------- | ----------------------------------------------------------------------- |
| Map       | `triage` | Type, size, route, change id, areas, CodeGraph impact, risks, questions |
| Reproduce | `qa`     | Bugs only. Reproduction steps, console and network evidence             |

## Verify (step 7)

Each phase is one or more agent calls in order. Agents in the same phase run in parallel. Work is split across them, never given to one agent whole. Layout shift for signed-out pages: `node .agents/scripts/layout-shift.mjs --hover --overflow` (needs a running server; `BASE=` selects it). `--hover` also fails when hovering any control moves or resizes its neighbors; `--overflow` fails when a box pokes past its frame or a demo frame's content is off center.

| Phase           | Agent                                        | Rule                                                                                                              |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Verify          | `verifier` ×N (parallel) → `engineer`        | One commands verifier plus evidence verifiers split by capability. Max 3 fix loops.                               |
| QA              | script + `qa` ×pairs (parallel) → `engineer` | Signed-out, layout-shift, and metadata checks by script; live slices, one `qa` per browser pair. Max 2 fix loops. |
| Conform         | `steward`                                    | Anti-slop and conventions on the changed lines. Behavior unchanged.                                               |
| Impact          | `triage`                                     | `codegraph impact` for each changed exported symbol. Lists callers outside the diff.                              |
| Review          | `reviewer`, `security`, `designer`           | Security runs if Convex, auth, or env changed. Designer runs if UI changed.                                       |
| Verify findings | skeptic per finding                          | Only critical, high, and important findings are verified. Real ones are fixed. Max 2 rounds.                      |
| Sync            | `steward`                                    | Updates the `twoplay` references and `decisions.md`.                                                              |

It stops on a failed verify or QA after its loops, or asks the user when review findings stay unresolved.

## Testing

| Layer             | Tool                                | Location                  |
| ----------------- | ----------------------------------- | ------------------------- |
| Convex functions  | Vitest + convex-test (edge-runtime) | `convex/**/*.test.ts`     |
| Plain TS          | Vitest (node)                       | `src/**/*.test.ts`        |
| Components, runes | Vitest + Testing Library (jsdom)    | `src/**/*.svelte.test.ts` |
| Live app          | `qa` agent, chrome-devtools MCP     | `browser-a`…`browser-d`   |

QA browser pairs: pair 1 is `browser-a` + `browser-b`, pair 2 is `browser-c` + `browser-d`. One `qa` agent per pair, never shared. QA sign-in (Clerk dev instance, existing test users, email code `424242`): `player.a+clerk_test@gmail.com` (Alex, `browser-a`), `player.b+clerk_test@gmail.com` (Blair, `browser-b`), `player.c+clerk_test@gmail.com` (Casey, `browser-c`), `player.d+clerk_test@gmail.com` (Drew, `browser-d`). Clerk rejects `example.com`, and sign-up from the QA browsers hits a captcha, so create new test users with the Clerk Backend API.

## Commands

| Command                          | Does                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `/dev:work <request>`            | Full flow                                                    |
| `/dev:work <change-id>`          | Resume                                                       |
| `/dev:status`                    | Active changes and their next step                           |
| `/dev:review [base]`             | Review panel on the current diff. Read-only.                 |
| `/dev:qa <flow\|bug\|change-id>` | Live test or debug in two browsers                           |
| `/dev:deslop [base]`             | Steward conform on the current diff                          |
| `/dev:audit [area]`              | Steward drift report. Read-only.                             |
| `/opsx:*`                        | Direct OpenSpec commands (optional; `/dev:work` covers them) |

## Agents

| Agent       | Role                            | Edits                    |
| ----------- | ------------------------------- | ------------------------ |
| `triage`    | Classify, size, CodeGraph map   | No                       |
| `architect` | Write a change as a subagent    | `openspec/` only         |
| `engineer`  | Logic, Convex, runes            | Yes                      |
| `designer`  | UI, Tailwind, accessibility     | Yes                      |
| `steward`   | Conventions, architecture, docs | Yes, behavior-preserving |
| `verifier`  | Tests and evidence              | No                       |
| `qa`        | Live browser test and debug     | No                       |
| `reviewer`  | Correctness, spec, conventions  | No                       |
| `security`  | Auth, trust boundary            | No                       |

## Rules

- OpenSpec owns specs and plans.
- All agent-written code follows `anti-slop`.
- Explore with CodeGraph first. Check impact before editing a shared symbol.
- Every behavior change has a Vitest test.
- No completion claim without `pnpm test` and `pnpm check` passing in the same run.
- Work stays on the current branch unless `--branch`. Never force-push or `convex deploy`.
