# Decisions log

Conventions and architecture decisions, newest first. Maintained by the `steward` agent. Each entry
says what was decided, why, and what it supersedes. When a decision changes a rule, update the rule
in `architecture.md` / `conventions.md` too. This log is the history, and those files are the current truth.

Template:
```
## YYYY-MM-DD — <short title>
**Decision:** <the rule, one or two sentences>
**Why:** <the reason, one or two sentences>
**Supersedes:** <earlier decision or "—">
**Follow-ups:** <existing code that now violates it, or "—">
```

## 2026-11-02 — One test file per source file
**Decision:** Each source file has exactly one test file, with the same name and next to it, and one `describe` per export.
Barrels, `types.ts`, and `schema.ts` are exempt.
**Why:** The rooms tests were split into 12 files and duplicated `resign`/`timeout` coverage from `games`.
**Supersedes:** —
**Follow-ups:** `convex/models/rooms/index.ts` (719 lines) mixes lifecycle, play, and history. Split it as a `/dev:work`
refactor, and its test file splits with it.

## 2026-11-02 — Vitest and live QA
**Decision:** Every behavior change has a Vitest test (projects: convex, server, client). User-visible scenarios
are also checked live by the `qa` agent in two browsers (`browser-a`, `browser-b`) as part of `dev-build`.
**Why:** `pnpm check` proves types, not behavior. Multiplayer flows need two real sessions.
**Supersedes:** "No test runner; `pnpm check` + code-path evidence".
**Follow-ups:** Known bugs are recorded as `test.fails`.

## 2026-11-02 — CodeGraph for code navigation
**Decision:** Agents explore code through CodeGraph (`codegraph_explore` over MCP, plus `codegraph impact`/`callers` from the
CLI) before Grep/Read, and check the blast radius before changing a shared symbol. The index is local and gitignored, and the server is registered in `.mcp.json`.
**Why:** It finds code in fewer tool calls, and impact/caller queries catch affected code outside the diff.
**Supersedes:** —
**Follow-ups:** —

## 2026-11-02 — Anti-slop applies to all agent-written code
**Decision:** Every agent follows `.agents/skills/anti-slop` while writing, and `/dev:work` runs a
steward conform (deslop) pass on every diff before review.
**Why:** Generated code drifts toward noise comments, defensive clutter, and overbuilding, and
review time should go to logic, not cleanup.
**Supersedes:** —
**Follow-ups:** —

## 2026-11-02 — Agent config lives in `.agents/`
**Decision:** `.agents/` is the single source of truth for skills, agents, and commands. `.claude/`
only holds symlinks (`.agents/link.sh`). Work goes through `/dev:work`, and specs live in OpenSpec.
**Why:** One tool-agnostic home, with Claude Code reading it through links.
**Supersedes:** per-tool `.claude/skills` + `.agents/skills` split.
**Follow-ups:** —
