# Workflow

Entry point: `/dev:work <request>`. The command orchestrates. Two saved workflows do the multi-agent work.

```
/dev:work
  1 Preflight       git state · codegraph init/sync
  2 dev-plan        Map → Spec
  3 Gate            user approves the plan (skipped with --auto)
  4 dev-build       Implement → Verify → Conform → Impact → Review → Sync
  5 Finish          validate · archive · commit · push (--push)
```

## dev-plan (`.agents/workflows/dev-plan.js`)

| Phase | Agent | Output |
|---|---|---|
| Map | `triage` | Type, size, change id, areas, CodeGraph impact, risks, questions |
| Spec | `architect` | OpenSpec change, validated with `--strict`, and its task groups |

Returns early on: `question`, `trivial`, `needs-input` (blocking questions), and `needs-brainstorm` (large changes).

## dev-build (`.agents/workflows/dev-build.js`)

| Phase | Agent | Rule |
|---|---|---|
| Implement | `engineer`, `designer` | Task groups in order. Consecutive `(parallel-safe)` groups run together. |
| Verify | `verifier` → `engineer` | Check, format, build, and scenario evidence. Max 3 fix loops. |
| Conform | `steward` | Anti-slop and conventions on the changed lines. Behavior unchanged. |
| Impact | `triage` | `codegraph impact` for each changed exported symbol. Lists callers outside the diff. |
| Review | `reviewer`, `security`, `designer` | Security runs if Convex, auth, or env changed. Designer runs if UI changed. |
| Verify findings | skeptic per finding | Only critical, high, and important findings are verified. Real ones are fixed. Max 2 rounds. |
| Sync | `steward` | Updates the `twoplay` references and `decisions.md`. |

End states: `built`, `blocked`, `verify-failed`, and `review-unresolved`.

## Paths

| Size | Path |
|---|---|
| trivial | engineer or designer → scan → `pnpm check` → reviewer → commit. No OpenSpec. |
| small | dev-plan → gate → dev-build → finish |
| large | dev-plan → brainstorm with the user → dev-plan → gate → dev-build → finish |

## Commands

| Command | Does |
|---|---|
| `/dev:work <request>` | Full flow |
| `/dev:work <change-id>` | Resume |
| `/dev:status` | Active changes and their next step |
| `/dev:review [base]` | Review panel on the current diff. Read-only. |
| `/dev:deslop [base]` | Steward conform on the current diff |
| `/dev:audit [area]` | Steward drift report. Read-only. |
| `/opsx:*` | Direct OpenSpec commands |

## Agents

| Agent | Role | Edits |
|---|---|---|
| `triage` | Classify, size, CodeGraph map | No |
| `architect` | Write the OpenSpec change | `openspec/` only |
| `engineer` | Logic, Convex, runes | Yes |
| `designer` | UI, Tailwind, accessibility | Yes |
| `steward` | Conventions, architecture, docs | Yes, behavior-preserving |
| `verifier` | Evidence | No |
| `reviewer` | Correctness, spec, conventions | No |
| `security` | Auth, trust boundary | No |

## Rules

- OpenSpec owns specs and plans.
- All agent-written code follows `anti-slop`.
- Explore with CodeGraph first. Check impact before editing a shared symbol.
- No completion claim without `pnpm check` passing in the same run.
- Work stays on the current branch unless `--branch`. Never force-push or `convex deploy`.
