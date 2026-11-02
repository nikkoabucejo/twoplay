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

## 2026-11-03 — Client imports only function-free Convex modules
**Decision:** Client code value-imports only `_generated/api`, `models/*/constants.ts`, and
`models/games/<game>/{index,rules}.ts`, none of which reach a Convex function. Shared values live in a
model's `constants.ts`. Enforced by `convex/client-boundary.test.ts`.
**Why:** Convex warns when a function builder runs in the browser, and a value import loads the
server function module and its import graph into the client bundle.
**Supersedes:** —
**Follow-ups:** —

## 2026-11-02 — Chess rules through chess.js, wrapper only
**Decision:** chess.js, pinned to exactly 1.4.0, is imported only by
`convex/models/games/chess/rules.ts`. State is FEN plus the position keys since the last capture or
pawn move. Enforced by the import-guard test in `convex/models/games/chess/rules.test.ts`.
**Why:** It is mature and covers FIDE edge cases. The wrapper keeps the pure-rules API and the engine
contract, and the stored keys restore the threefold check that chess.js loses on FEN load.
**Supersedes:** —
**Follow-ups:** —

## 2026-11-02 — Rounds settle when they end
**Decision:** Every path that ends a round (`play`, `resign`, `timeout`, `abandon`, `sweep`) calls
`settleRound` (`convex/models/games/index.ts`), which credits score and rating once (`games.settledAt`).
A round with an empty seat, or voided by the idle sweep, is `isNoContest` and stays out of history and stats.
**Why:** Crediting only on `rematch` left wins uncounted when nobody pressed Rematch, and let a seat
that never filled turn an abandon into a loss.
**Supersedes:** crediting in `rematch` and `forfeitRoom`.
**Follow-ups:** —

## 2026-11-02 — Room predicts the viewer's moves
**Decision:** `Room` takes a `ClientEngine` (`applyMove`, `status`) in its constructor and owns
`activeSeat`; subclasses don't override it. The viewer's moves show as a pending queue in
`displayState`, `activeSeat`, and `isMyTurn`. `isMyTurnConfirmed` (server only) feeds `TurnAlert`,
and `rejection` drives the toast and the `Board` `rejectionId` shake. The client imports a game's
own barrel and `rules.ts`, never `convex/models/games/index.ts`.
**Why:** Moves showed only after a server round-trip. One shared prediction path replaces each
subclass's own turn derivation.
**Supersedes:** subclasses overriding the abstract `activeSeat`.
**Follow-ups:** —

## 2026-11-02 — `components/layout` holds page regions only
**Decision:** `components/layout` holds only page regions (`board`, `dock`, `feed`, `footer`, `header`, `page`),
each named in one word. Generic pieces live in `components/ui`: `Banner` (message, tone, action), `Link`
(`linkVariants`), and `Meta`. `Page` renders the page `h1` from `title`; there is no separate page-header component.
**Why:** Layout should name regions of the page, not parts of a single region.
**Supersedes:** `layout/{tab-bar,nav-link,page-header,meta,auth-error-banner}` (`TabBar`, `NavLink`, `PageHeader`, `AuthErrorBanner`).
**Follow-ups:** —

## 2026-11-02 — App shell: one frame per route type, one surface per destination
**Decision:** The root layout picks the game-room frame (fixed, no footer or dock) or the scrolling page frame
from `isGameRoomRoute(page.route.id)`, which matches the `[code]` segment. `NAV_ITEMS` is the one nav list:
header from `sm`, `Dock` below it. The wordmark is the only home link and the footer holds Support only.
**Why:** The `(games)` group also holds the landing page. Repeating links across header, footer, and menu was rejected.
**Supersedes:** —
**Follow-ups:** —

## 2026-11-02 — Seat tokens, caption size, and stable layout
**Decision:** Seat colors come from `--seat-N` in `layout.css` (`text-seat-N`, `var(--seat-N)`) and `SEAT_COLORS`
in TS, kept equal by `utils/style/seats/index.test.ts`. Small text is `text-caption`. Content doesn't shift after
first paint (reserved slots, fixed widths, sized placeholders, overlaid banners). Single-line labels are
`whitespace-nowrap`. Copy is short, plain, and sentence case. `tv` comes from `$lib/utils/style`.
**Why:** Seat colors existed in four forms and drifted. Late banners, font swap, and turn changes moved the page.
**Supersedes:** `PLAYER_COLORS` in `features/play/games.ts`, literal `cyan-500`/`pink-500` and `text-[Npx]`.
**Follow-ups:** —

## 2026-11-02 — Verify and QA run in parallel slices
**Decision:** Verification is split across agents that run at once: one commands `verifier`, plus evidence
verifiers split by capability. QA runs scripted checks first (`.agents/scripts/layout-shift.mjs`, `curl`), then one
`qa` agent per browser pair (a+b, c+d), each with its own scenario slice and time budget.
**Why:** A single QA agent checking everything took about 30 minutes per run and blocked the flow.
**Supersedes:** a single `verifier` and `qa` run per loop.
**Follow-ups:** sign in `browser-c`/`browser-d` once (Casey, Drew).

## 2026-11-02 — Polish lane in /dev:work
**Decision:** UI, UX, copy, layout, accessibility, and performance polish with no Convex, schema, auth, or rule change runs
the polish lane: `ff` route, one area owner, tests for logic only, batched feedback, scripted layout-shift checks,
one `qa` run, one combined review.
**Why:** `polish-app-shell` took the full `new` route with a spec revision per piece of feedback, class-name tests, and repeated
two-browser QA. The overhead dwarfed the edits.
**Supersedes:** —
**Follow-ups:** —

## 2026-11-02 — /dev:work steps are visible agents
**Decision:** `/dev:work` runs triage and every verify phase as `Agent` calls in the conversation, each announced
with a `▸` line and closed with a `✓`/`✗` line. It does not use the Workflow tool.
**Why:** Background workflows hid what was running, so the user couldn't tell whether anything was in progress.
**Supersedes:** the `triage` and `verify` saved workflows (`.agents/workflows/`, now removed).
**Follow-ups:** —

## 2026-11-02 — OpenSpec plans and applies
**Decision:** `/dev:work` triages a request, recommends an OpenSpec route (`none`, `explore`, `new`, `ff`, `propose`), and the
OpenSpec skills plan and apply the change until it is archived. The saved workflows are `triage` (before planning) and `verify` (after apply).
**Why:** OpenSpec already covers planning and apply. The route lets the request pick how much review each artifact gets.
**Supersedes:** the `dev-plan` and `dev-build` workflows.
**Follow-ups:** —

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
