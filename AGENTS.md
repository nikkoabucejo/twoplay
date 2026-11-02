# twoplay

Real-time two-player games. SvelteKit, Svelte 5 runes, Tailwind v4, shadcn-svelte, Convex, Clerk. pnpm.

## Read
- `WORKFLOW.md`: how work flows (`/dev:work`, workflows, agents).
- `GLOSSARY.md`: domain, code, and workflow terms.
- `.agents/skills/twoplay/`: architecture, conventions, backend, games, decisions.

## Work
- Use `/dev:work <request>`. Flags: `--auto`, `--no-commit`, `--branch`, `--push`.
- Other commands: `/dev:status`, `/dev:review`, `/dev:deslop`, `/dev:audit`, `/opsx:*`.

## Rules
- The Convex server is the authority. Every mutation authenticates via `ctx.auth` and checks room membership.
- All agent-written code follows `.agents/skills/anti-slop`.
- Explore with CodeGraph (`codegraph_explore`) before Grep/Read. Run `codegraph impact <symbol>` before editing a shared symbol.
- No completion claim without `pnpm check` passing (0 errors, 0 warnings). There is no test runner.
- Never push without being asked, force-push, run `convex deploy`, or edit `.env*`.
- Docs are factual and minimal.

## Layout
```
.agents/                 source of truth; .claude/* are symlinks into it
  skills/<name>/         project, OpenSpec, SuperSpec, stack, anti-slop
  agents/<name>.md       triage architect engineer designer steward verifier reviewer security
  commands/{dev,opsx}/   slash commands
  workflows/*.js         dev-plan, dev-build
  link.sh                recreate .claude symlinks after adding or renaming
  SOURCES.md             upstream origin of third-party skills
openspec/                specs (truth) and changes (proposals)
.codegraph/              local CodeGraph index (gitignored); server in .mcp.json
```

New clone: `pnpm install`, then `codegraph init -y`, then `.agents/link.sh`.
