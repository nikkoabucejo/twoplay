# Design

## Context

- `src/routes/about/+page.svelte` renders `Meta` and `Page` around `About` (`src/lib/features/core/about/about.svelte`). `About` owns the only `h1` and exports `REPO_URL` and `TIMELINE` from its module script. Callers: the route, `features/core/about/index.ts`, `features/core/index.ts`, `about.svelte.test.ts`, `src/routes/about/page.svelte.test.ts`.
- The root layout's `<main>` is the scroll container (`overflow-y-auto`), not the window. The header sits outside `<main>`, so a section is below the header when its top is at or below `main`'s top. `afterNavigate` resets `main.scrollTop`.
- `bindClickSounds(document, …)` ticks on real user activations only (ui-click-sounds "Silent controls" excludes script-activated controls).
- The approved prototype (`about-build.html`) builds the page by mutating its own DOM (`innerHTML` restore, text-node replacement). That cannot be ported as-is into Svelte-owned markup.
- The client test project is jsdom (no layout, no `matchMedia` unless mocked, as in `board.svelte.test.ts`). There is no SSR render test harness.
- Route `/about` is unchanged. `INDEXED_PATHS` (`src/lib/utils/seo`), the sitemap (`src/routes/sitemap.xml`), and the footer link are unaffected because they reference the path only, not the page content.

## Goals / Non-Goals

**Goals:**

- Complete, final content in SSR HTML on every request; the build is a client layer.
- No layout shift from the build (≤ 0.01 at 360x640 and 1280x800, measured through the run).
- One rAF loop, fully cancellable, paused while hidden.
- Sections that look like the project's own artifacts, not cards.

**Non-Goals:**

- Changing other info pages, `Page`, the footer, or the seo utilities.
- Persisting "seen" across sessions (`sessionStorage` only).
- Sound during the build.

## Decisions

### 1. Pre-paint state: inline head check + opacity hide, with a timed fallback

On a first-session visit, the browser paints SSR HTML before hydration. Options:

- **A. Inline head script (chosen).** `+page.svelte` adds `<svelte:head>{@html PREPAINT_SCRIPT}</svelte:head>`. The script runs during HTML parse, wrapped in `try/catch`: if `sessionStorage["twoplay:about-built"]` is unset, `matchMedia("(prefers-reduced-motion: reduce)")` is false, and the app's motion preference (`localStorage["twoplay:prefs"]`, `motion`) is not `"reduce"`, it sets `document.documentElement.dataset.aboutBuild = "pending"`. CSS in `about.svelte`: `:global(html[data-about-build="pending"]) .about-root { opacity: 0; animation: about-reveal 0s 3s forwards }`. Layout is untouched (opacity only). After hydration the controller applies the pending state (opacity 0, with no transition into it) to every target, then removes the attribute in the same frame, so the first visible frame is the empty canvas. When `About` does not autoplay, it removes the attribute itself. If JS never runs, the keyframe reveals the page after 3 s. On client-side navigation the `{@html}` script does not execute, but the controller's `$effect` runs before the browser paints the inserted DOM, so the same hand-off applies.
- **B. SSR the pending state.** Rejected: crawlers, no-JS visitors, and every later visit would get an empty page first.
- **C. Accept the flash.** Rejected by the triage finding.

The script source is a constant (`PREPAINT_SCRIPT` in `prepaint.ts`) built from the same `ABOUT_BUILD_KEY`, `PREFERENCES_KEY`, and media query the controller uses, so the two decisions cannot drift. The controller reads the preference from storage (`isReducedMotion`), not the `.reduce-motion` class, because the layout applies that class after `About`'s first effect. There is no CSP in this app, so an inline script is allowed. If a CSP is added later, this script needs a hash.

### 2. Declarative targets, imperative overlay, reactive text

The prototype mutates the page DOM. In Svelte:

- **Targets** are declared in markup: `data-build="frame fill type"` and `data-build-id`. At run start the controller reads them under the `.about-root` element, in DOM order, into plain descriptors `{ id, sectionId, acts, parentId, isFillable, isTestable, isSecure }`.
- **Target state** is written as a `data-build-state` attribute (`pending | framed | filled | done`) and inline `transform` / `clip-path` on target elements. Pop items start hidden by a `data-build-hidden` attribute, not inline style, so a `:focus-within` rule can show a focused control inside a pending target or a hidden item. Svelte manages neither, so it never overwrites them. `finish()` removes every attribute and inline style it set.
- **Typing and counting** are Svelte components that read the controller from context: `Typed` always renders one plain `{text}` node, so the DOM text and accessible name never change. During a build, a shared CSS Custom Highlight (`about-untyped`, `color: transparent`) hides the untyped rest, and an `aria-hidden` caret moves out of flow by `translate`. Typing is a repaint only. Pending targets are invisible; nothing is painted until it is built. `Readout` renders the final value, or a counting value in a fixed-width `tabular-nums` box.
- **Overlay effects** (cursors, marquee, guides, redline, region, badges, bubbles, panels) live in one `aria-hidden` absolute layer (`overlay.svelte`) that extends to the edges of `<main>`'s scroll area and are moved with `transform` from a single rAF loop. They never dispatch events to targets.

Alternative considered: port the prototype's text-node replacement and `innerHTML` restore. Rejected: it detaches nodes Svelte's `{#each}` blocks track, and restore-by-innerHTML would drop hydration bindings.

### 3. Controller as a rune class with a pure planner

- `plan.ts` (pure, no DOM): `TEAM` (nine agents: name, color, join offset, roles in priority order; triage first, ~1000 ms apart), `HANDOFF`, `planSteps(targets)` → step graph (per section: scan → each target's steps [frame unless nested in a framed parent, then its acts, check if fillable, test if testable, secure if it holds the repo link] → review), `isReady(step, graph)`, `pickStep(roles, graph)`. Rules match the prototype: a section's scan waits for the previous section's first frame, steps wait for their predecessor and parent frame, review waits for all section steps. The status section (`STATUS_SECTION`, the HUD) is the exception: its scan is ready at once, and the section after it orders by the section before it.
- `build.svelte.ts`: `AboutBuild` class. `$state` `phase` (`idle | building | done`), `joined`, `stepsDone`, `elapsedMs`, `isFollowing`; `$derived` `progress`, `hudLabel`. Public `start()`, `skip()`, `replay()`, `destroy()`, `shouldAutoplay()`. Private run token `{ isCancelled }`, one rAF id, timer ids in a `Set`. Timers and rAF are injected (`{ now, setTimeout, clearTimeout, requestAnimationFrame, cancelAnimationFrame }`, defaults to `window`) so Vitest fake timers drive it. `setupAboutBuild()` / `getAboutBuild()` provide it by context to `Typed`, `Readout`, `Hud`, and `Overlay`.
- `work.ts`: `WORK`, one async function per step kind (`scan`, `frame`, each act, `check`, `test`, `secure`, `review`), and `ASSISTS`, one per assist kind. Each takes the agent, step, and a `Run` (`sleep`, `tween`, `box`, `overlay`) that resolves at once when cancelled. `test` and `secure` animate the cursor and a ripple only. Pacing constants target ~35–40 s at 1280x800.
- Acts are read from `data-build` in markup order: `fill`, `type`, `size`, `paint`, `pop`, `line`, `draw`, `radius`, `spacing`, `gradient`, `shadow`, `align`, `code`, `layers`, `contrast`. Each is a step kind with a `StepWork` in `WORK`.
- Assists (`measure`, `comment`, `inspect`, `pair`) are not in the step graph and do not count toward progress. An agent with no pickable step takes the first of its `assists` (priority order in `TEAM`) that has a free target: a built element in the work window (for `measure`, one with the next built element at least 4 px below it), or for `pair` a running `type`/`draw`/`code`/`gradient` step. One agent per target; each kind rests 6 s per target, and the agent rests 120 ms after each assist so its loop always yields. The controller passes `Assist { kind, el, to, joins }` to its `AssistWork`.
- `pickStep` and `isReady` are tested as pure functions; `AboutBuild` is tested with fake timers and stub targets.

Alternative considered: one big `$effect` in `about.svelte`. Rejected: untestable and against the rune-class convention.

### 4. Autoplay, Skip, Replay

- `shouldAutoplay()`: `false` under reduced motion (the OS setting or the app's "Always reduce"); `false` if the session flag is set; `true` if storage throws. `start()` writes the flag (in `try/catch`) before the first agent joins, so a reload mid-build shows the final page.
- `skip()`: cancels the token, clears timers and the rAF, removes overlay nodes and target attributes, sets `phase = "done"` with label "Skipped the build".
- `replay()`: same teardown, `main.scrollTop = 0`, then `start()`. Allowed under reduced motion because it is user-initiated.
- End of run: agents gather in a ring around the credit heading, fade out, `phase = "done"`, label "Built by 9 agents in {s}s" (one decimal). `elapsedMs` is set once, from the build clock, when the run completes.
- Pop items animate through `run.tween`, not the Web Animations API, so Skip and Replay cancel them with the rest of the run.

### 5. Follow-scroll inside `<main>`

The scroll container is `root.closest("main")`. The work window is `main`'s visible area below a 20 px top gap plus 15% of its height below. The status section's steps rank ahead of every other step and skip the window gate, so the HUD is built while the hero is. Outside the first section, agents pick through `pickStep(roles, graph, place)`, where `place` is the element's top if it overlaps the window and `null` otherwise, so the highest in-window step goes first and nothing starts on an element wholly above the view. When the first section is reviewed, the controller fixes one curve: speed = remaining distance ÷ max(target run length − 3 s − elapsed, 8 s), capped at 0.25 px/ms, with a target run of 42 s (36 s below `sm` or on coarse pointers); 1 s linear ease-in, constant speed, 1 s ease-out at the bottom. The builders adapt instead: each frame while scrolling, the controller takes, over in-window targets, the largest ratio of (steps left × 1.2 s) to the time until that target scrolls out, clamps it to 1–2.2, and low-pass filters it (500 ms). Through the hero, the base pace is 1. Once the first section is reviewed, it steps to 1.5, 2.5, then 3 over thirds of the rest of the run: thirds of follow-scroll's distance while it runs, else thirds of the steps left at the review (reduced motion, or after the visitor stops it). Each step eases in linearly over 1 s, the pace never drops, and 3 holds to the end, through leftovers, gathering, and leaving. `run.pace` is the larger of the base pace and catch-up (at most 3), and every `run.sleep` and `run.tween` duration is divided by it. The scroll curve does not depend on it. The rAF loop writes `from + offset(t)` (fractional) each frame, with `t` on the build clock, so a hidden tab resumes on the curve. Off under reduced motion, including the app's "Always reduce". The gate opens once follow-scroll lands (the 3 s leaves time for leftovers, gathering, and leaving); under reduced motion there is no gate, and agents pick in section order (status first). When the visitor stops follow-scroll, the gate follows their view until 1.5 s pass with nothing claimed, then stays open for the rest of the run, so the run cannot deadlock or drip-feed one step per stall. `wheel`, `touchstart`, `pointerdown`, and `focusin` (Tab navigation) on `main` and scroll keys (`ArrowUp/Down`, `PageUp/Down`, `Home`, `End`, `Space`) on `window` set `isFollowing = false` for the rest of the run. Listeners are passive and removed in `destroy()`.

### 6. Performance and mobile

- One rAF loop drives tweens and follow-scroll. Follow-scroll and catch-up reads are batched at the start of each frame; the scroll write comes last. Tweens cache their geometry before they start (the draw tween samples its path up front), except the typing caret, which reads its position each frame because it moves with the typed text.
- `visibilitychange`: hidden → cancel the rAF and freeze tween clocks; visible → resume. `destroy()` (from `About`'s `$effect` teardown) cancels everything.
- Below `sm` or on `(pointer: coarse)`: skip guides and redlines, cap simultaneous chat bubbles at one, scale pacing by 0.85 so the run stays near 35 s.
- All overlay motion uses `transform` / `opacity`; `will-change: transform` only on agent cursors.
- The overlay clips to `<main>`'s full scroll area on all four sides, not the root's box, so effects in the margins and above the first or below the last section stay whole without extending `<main>`'s scroll. The offsets are measured on mount and resize and applied as a transform.

### 7. Creative treatments (designer executes)

Palette: seat-0 cyan and seat-1 pink via `text-seat-N` / `var(--seat-N)`; agent colors are overlay-only constants in `plan.ts`. No card grids.

- **Hero:** seat-color wordmark in the `h1` (`two` cyan, `play` pink). The tic-tac-toe board is drawn by agents stroke by stroke; the winning diagonal is a seat-0 → seat-1 gradient. Stats sit in a scoreboard strip: four `Readout`s divided by hairline ticks, not boxes. Ambient: the win line breathes slowly (stops under reduced motion).
- **Who I am:** short bio with an `NA` monogram, then the React → Svelte 5 mapping as a unified diff (`- useState` in pink, `+ $state` in cyan, mono, line numbers in the gutter). "What carried over" as a mono `// carried over` list under the diff.
- **Why this?:** three notes on one ruled sheet: mono labels (`the product`, `the stack`, `the process`) in a left column, prose on the right, hairlines between. One column below `sm`.
- **Highlights:** eight instrument readouts: large tabular number, a unit, and a ruler-tick scale under it with a needle at the value; the layout-shift readout shows `0.1443 → 0`. Two columns below `sm`, four from `lg`; separated by tick rules, not borders.
- **How it's built:** the eight `/dev:work` steps as a track with numbered nodes and the agent who owns each step; a cyan token travels the rail and pauses at Approval, the one pink node, labelled Nikko. Horizontal from `md`, vertical rail below `md`. Under reduced motion the token rests on Approval.
- **What I learned:** the quote set large, then eight lessons as numbered decision records (`01`–`08`, mono index, title, one-line body) on a left rule, in the style of `decisions.md`.
- **Timeline:** a git-graph rail. Each milestone has a commit dot (alternating seat colors), the date, and the short hash in mono. A dashed segment between Jul 16 and Nov 2 marks the gap. Hashes from `git log`: First commit `09fda3a`, Checkers `e5c5c65`, Agents and clocks `79c5ffe`, Find match and ratings `8ca5fd4`, One command `bd0b44f`, App shell polish `d3ac3cb`, Optimistic moves `87903a9`, Round settlement `96da485`.
- **What's next:** an open change rendered like `tasks.md`: unchecked boxes (decorative `aria-hidden` squares, not inputs), each item tagged `next` or `later`. Items from the README roadmap: rate limiting, more games, a smaller rooms module, clock-skew correction. The README's sitemap item is omitted because the sitemap shipped in `fc2f8d8`.
- **Credit:** "Made by Nikko Abucejo" large; the repo link keeps the accessible name "Source on GitHub" and shows `nikkoabucejo/twoplay` in mono; "Take the tour" text link beside it.
- **HUD:** an in-flow build bar under the hero, itself a build section (`data-build-section="status"`) that the agents build first, alongside the hero. Invisible until built, at a fixed height, so it never shifts layout. Skip is the first focusable control in the page content and shows when focused; Escape skips a running build (`aria-keyshortcuts="Escape"`). It shows the agent roster dots, `{joined}/9 agents · {progress}%`, a thin progress bar (`scaleX`), and one button whose label switches between Skip and Replay in a fixed-width slot. No `role="status"`, no `aria-live`.
- **Mobile:** single column, 16 px gutters, the board scales to the column width (max 18rem), no horizontal scroll at 360 px, touch targets ≥ 44 px for HUD and links.

## Risks / Trade-offs

- [Head script hides content if the controller crashes after hydration] → the 3 s CSS reveal and `destroy()`/`finish()` always remove `data-about-build`.
- [Typing moves text in flow] → the text node never changes; only a highlight range and an out-of-flow caret update; checked by the layout-shift run through the build.
- [Long run on slow phones] → pacing scale on small screens and Skip prominent from the start.
- [jsdom has no layout, so `work.ts` geometry is untested] → planner, controller, and teardown are unit-tested; geometry is checked live at both viewports.
- [`layout-shift.mjs` stops 5 s after idle, before a 40 s build ends] → add a per-run wait option so `/about` is measured through the build.

## Migration Plan

Client-only. Rollback is reverting the commit. No data or Convex changes.
