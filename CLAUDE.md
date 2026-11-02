# twoplay

Real-time two-player games: SvelteKit + Svelte 5 runes + Tailwind v4 + shadcn-svelte + Convex + Clerk. pnpm.

## Start here
- **Project knowledge:** `.claude/skills/twoplay/` (architecture, conventions, backend, games). Read it before writing code.
- **Do work through `/dev:work <request>`.** It runs triage → OpenSpec spec → implement → verify → review → archive → commit.
  - `/dev:work <change-id>` resumes. `/dev:status` shows in-flight work. `/dev:review` runs the review panel on the current diff.
  - Flags: `--auto` skips the plan-approval gate; `--no-commit` stops before committing.

## Tooling
- **OpenSpec** (`openspec` CLI, `/opsx:*` commands) owns specs: `openspec/specs/` is the truth, `openspec/changes/` holds proposals.
- **SuperSpec discipline skills** (vendored, adapted to OpenSpec): `superspec-brainstorm`, `superspec-tdd`,
  `superspec-debugging`, `superspec-verification`, `superspec-receiving-review`, `superspec-finish-branch`.
- **Agents** (`.claude/agents/`): `triage`, `architect`, `engineer`, `designer`, `security`, `verifier`, `reviewer`.

## Non-negotiables
- The Convex server is the authority. Authenticate via `ctx.auth` and check room membership in every mutation.
- No completion claim without fresh `pnpm check` (0 errors, 0 warnings). There is no test runner yet.
- Never push, run `convex deploy`, or edit `.env*` without being asked.
