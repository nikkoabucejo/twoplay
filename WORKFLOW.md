# Workflow

Entry point: `/dev:work <request>`. The command orchestrates. OpenSpec plans and applies. Two saved workflows do the multi-agent work around it.

```
/dev:work
  1 Preflight       git state · codegraph init/sync · dev server
  2 triage          Map → Reproduce (bugs)
  3 Route           user picks the OpenSpec route (recommended one first)
  4 Plan            OpenSpec artifacts via the chosen route
  5 Gate            user approves the change (skipped with --auto)
  6 Apply           openspec-apply-change, task groups to engineer/designer
  7 verify          Verify → QA → Conform → Impact → Review → Sync
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

## OpenSpec lifecycle

| OpenSpec step  | Where in `/dev:work`             | Skill followed            |
| -------------- | -------------------------------- | ------------------------- |
| Plan           | Plan, by route                   | see Routes                |
| Update         | Gate → Revise, or a blocked task | `openspec-update-change`  |
| Apply          | Apply                            | `openspec-apply-change`   |
| Verify         | verify → Verify                  | `openspec-verify-change`  |
| Sync + Archive | Archive                          | `openspec-archive-change` |
| Status         | `/dev:status`, Resume            | `openspec status`         |

`/opsx:*` commands remain available but are not needed.

## triage (`.agents/workflows/triage.js`)

| Phase     | Agent    | Output                                                                  |
| --------- | -------- | ----------------------------------------------------------------------- |
| Map       | `triage` | Type, size, route, change id, areas, CodeGraph impact, risks, questions |
| Reproduce | `qa`     | Bugs only. Reproduction steps, console and network evidence             |

## verify (`.agents/workflows/verify.js`)

| Phase           | Agent                              | Rule                                                                                              |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Verify          | `verifier` → `engineer`            | `pnpm test`, check, format, build, and a test per scenario. Max 3 fix loops.                      |
| QA              | `qa` → `engineer`                  | User-visible scenarios in `browser-a` + `browser-b`. Max 2 fix loops. `blocked` if no dev server. |
| Conform         | `steward`                          | Anti-slop and conventions on the changed lines. Behavior unchanged.                               |
| Impact          | `triage`                           | `codegraph impact` for each changed exported symbol. Lists callers outside the diff.              |
| Review          | `reviewer`, `security`, `designer` | Security runs if Convex, auth, or env changed. Designer runs if UI changed.                       |
| Verify findings | skeptic per finding                | Only critical, high, and important findings are verified. Real ones are fixed. Max 2 rounds.      |
| Sync            | `steward`                          | Updates the `twoplay` references and `decisions.md`.                                              |

End states: `verified`, `verify-failed`, `qa-failed`, and `review-unresolved`.

## Testing

| Layer             | Tool                                | Location                  |
| ----------------- | ----------------------------------- | ------------------------- |
| Convex functions  | Vitest + convex-test (edge-runtime) | `convex/**/*.test.ts`     |
| Plain TS          | Vitest (node)                       | `src/**/*.test.ts`        |
| Components, runes | Vitest + Testing Library (jsdom)    | `src/**/*.svelte.test.ts` |
| Live app          | `qa` agent, chrome-devtools MCP     | `browser-a`, `browser-b`  |

QA sign-in (Clerk dev instance): `player-a+clerk_test@example.com` / `player-b+clerk_test@example.com`, code `424242`.

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
