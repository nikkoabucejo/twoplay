# Workflow

Entry point: `/dev:work <request>`. The command orchestrates. Two saved workflows do the multi-agent work.

```
/dev:work
  1 Preflight       git state · codegraph init/sync · dev server
  2 dev-plan        Map → Spec
  3 Gate            user approves the plan (skipped with --auto)
  4 dev-build       Implement → Verify → QA → Conform → Impact → Review → Sync
  5 Finish          validate · archive · commit · push (--push)
```

## OpenSpec lifecycle

| OpenSpec step  | Where in `/dev:work`              | Skill followed                             |
| -------------- | --------------------------------- | ------------------------------------------ |
| Explore        | Large changes, before the spec    | `openspec-explore`, `superspec-brainstorm` |
| Propose        | dev-plan → Spec                   | `openspec-propose`                         |
| Update         | Gate → Revise, or build `blocked` | `openspec-update-change`                   |
| Apply          | dev-build → Implement             | `openspec-apply-change`                    |
| Verify         | dev-build → Verify                | `openspec-verify-change`                   |
| Sync + Archive | Finish                            | `openspec-archive-change`                  |
| Status         | `/dev:status`, Resume             | `openspec status`                          |

`/opsx:*` commands remain available but are not needed.

## dev-plan (`.agents/workflows/dev-plan.js`)

| Phase      | Agent       | Output                                                           |
| ---------- | ----------- | ---------------------------------------------------------------- |
| Map        | `triage`    | Type, size, change id, areas, CodeGraph impact, risks, questions |
| Map (bugs) | `qa`        | Reproduction steps, console and network evidence                 |
| Spec       | `architect` | OpenSpec change, validated with `--strict`, and its task groups  |

Returns early on: `question`, `trivial`, `needs-input` (blocking questions), and `needs-brainstorm` (large changes).

## dev-build (`.agents/workflows/dev-build.js`)

| Phase           | Agent                              | Rule                                                                                              |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Implement       | `engineer`, `designer`             | Task groups in order, tests first. Consecutive `(parallel-safe)` groups run together.             |
| Verify          | `verifier` → `engineer`            | `pnpm test`, check, format, build, and a test per scenario. Max 3 fix loops.                      |
| QA              | `qa` → `engineer`                  | User-visible scenarios in `browser-a` + `browser-b`. Max 2 fix loops. `blocked` if no dev server. |
| Conform         | `steward`                          | Anti-slop and conventions on the changed lines. Behavior unchanged.                               |
| Impact          | `triage`                           | `codegraph impact` for each changed exported symbol. Lists callers outside the diff.              |
| Review          | `reviewer`, `security`, `designer` | Security runs if Convex, auth, or env changed. Designer runs if UI changed.                       |
| Verify findings | skeptic per finding                | Only critical, high, and important findings are verified. Real ones are fixed. Max 2 rounds.      |
| Sync            | `steward`                          | Updates the `twoplay` references and `decisions.md`.                                              |

End states: `built`, `blocked`, `verify-failed`, `qa-failed`, and `review-unresolved`.

## Testing

| Layer             | Tool                                | Location                  |
| ----------------- | ----------------------------------- | ------------------------- |
| Convex functions  | Vitest + convex-test (edge-runtime) | `convex/**/*.test.ts`     |
| Plain TS          | Vitest (node)                       | `src/**/*.test.ts`        |
| Components, runes | Vitest + Testing Library (jsdom)    | `src/**/*.svelte.test.ts` |
| Live app          | `qa` agent, chrome-devtools MCP     | `browser-a`, `browser-b`  |

QA sign-in (Clerk dev instance): `player-a+clerk_test@example.com` / `player-b+clerk_test@example.com`, code `424242`.

## Paths

| Size    | Path                                                                                       |
| ------- | ------------------------------------------------------------------------------------------ |
| trivial | engineer or designer → scan → `pnpm test` → `pnpm check` → reviewer → commit. No OpenSpec. |
| small   | dev-plan → gate → dev-build → finish                                                       |
| large   | dev-plan → brainstorm with the user → dev-plan → gate → dev-build → finish                 |

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
| `architect` | Write the OpenSpec change       | `openspec/` only         |
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
