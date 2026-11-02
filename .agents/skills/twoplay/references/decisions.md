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
