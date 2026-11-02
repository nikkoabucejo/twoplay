# twoplay

Real-time two-player games: SvelteKit + Svelte 5 runes + Tailwind v4 + shadcn-svelte + Convex + Clerk. pnpm.

## Start here
- **Project knowledge:** `.agents/skills/twoplay/` (architecture, conventions, backend, games). Read it before writing code.
- **Do work through `/dev:work <request>`.** It runs triage → OpenSpec spec → implement → verify → review → archive → commit.
  - `/dev:work <change-id>` resumes. `/dev:status` shows in-flight work. `/dev:review` runs the review panel on the current diff.
  - Flags: `--auto` skips the plan-approval gate; `--no-commit` stops before committing.

## Tooling
- **OpenSpec** (`openspec` CLI, `/opsx:*` commands) owns specs: `openspec/specs/` is the truth, `openspec/changes/` holds proposals.
- **SuperSpec discipline skills** (vendored, adapted to OpenSpec): `superspec-brainstorm`, `superspec-tdd`,
  `superspec-debugging`, `superspec-verification`, `superspec-receiving-review`, `superspec-finish-branch`.
- **Stack skills** (upstream, see `.agents/SOURCES.md`): `svelte-core-bestpractices`, `svelte-code-writer`,
  `shadcn-svelte`, `convex`, `convex-design`, `convex-authz`, `convex-reviewer`, `convex-migrate`, `convex-test`,
  `convex-deploy-guard`, `clerk`, `clerk-custom-ui`. Where they conflict with `twoplay`, the `twoplay` skill wins.
- **Agents** (`.agents/agents/`): `triage`, `architect`, `engineer`, `designer`, `security`, `verifier`, `reviewer`.

## Non-negotiables
- The Convex server is the authority. Authenticate via `ctx.auth` and check room membership in every mutation.
- No completion claim without fresh `pnpm check` (0 errors, 0 warnings). There is no test runner yet.
- Never push, run `convex deploy`, or edit `.env*` without being asked.

## Where agent config lives
`.agents/` is the single source of truth. Edit files there, never under `.claude/`.

```
.agents/
  skills/<name>/SKILL.md     # project knowledge, OpenSpec + SuperSpec skills
  agents/<name>.md           # subagents
  commands/{dev,opsx}/*.md   # slash commands
  link.sh                    # (re)creates the .claude/ symlinks
  SOURCES.md                 # upstream origin + commit of every third-party skill
```

`.claude/{skills,agents,commands}/*` are symlinks into `.agents/`, which is how Claude Code finds them.
After adding, removing, or renaming anything in `.agents/`, run `.agents/link.sh`.
`openspec update` writes into `.claude/skills` and `.claude/commands/opsx`; those paths are already
symlinks, so its output lands in `.agents/`. Run `.agents/link.sh` afterwards anyway.
