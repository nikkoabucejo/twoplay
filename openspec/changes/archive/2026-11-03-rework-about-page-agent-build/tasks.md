# Tasks

No Convex work in this change; all groups are client-side. Files are under `src/lib/features/core/about/` unless a path says otherwise.

## 1. Content constants and route contract

- [x] 1.1 [engineer] In `about.svelte.test.ts`, update tests first: `TIMELINE` renders in order with date and a 7-character `hash` per item (first is `09fda3a`, Jul 11, 2026); section `h2` order (Who I am, Why this?, Highlights, How it's built, What I learned, Timeline, What's next, Made by Nikko Abucejo); repo link contract (one link to `REPO_URL`, name /Source on GitHub/, `target="_blank"`, `rel="noopener noreferrer"`, no `hover-ring`); one `/tour` link; pipeline lists the eight steps and only Approval is marked as Nikko's. Remove the "Under the hood" assertions. Verify they fail against the current component with `pnpm test`.
- [x] 1.2 [engineer] In `about.svelte`'s module script, add `hash` to each `TIMELINE` entry (hashes in design.md §7), and add the static constants `STATS`, `CARRIED`, `MAPPING`, `NOTES`, `HIGHLIGHTS`, `PIPELINE` (step, owner, `isEngineer`), `QUOTE`, `LESSONS`, `ROADMAP` (title, body, `next | later`) with the copy from the prototype and README "What's next". Keep `REPO_URL` and `TIMELINE` exported; `index.ts` barrels unchanged. Verify `pnpm check`.
- [x] 1.3 [engineer] In `src/routes/about/page.svelte.test.ts`, keep "one h1 and the About title" and add: the page head contains the pre-paint script (`PREPAINT_SCRIPT` text). Verify with `pnpm test`.

## 2. Pre-paint check (parallel-safe)

- [x] 2.1 [engineer] Write `prepaint.test.ts`: evaluating `PREPAINT_SCRIPT` sets `html[data-about-build="pending"]` when the flag is unset and motion is allowed; does not set it when the flag `twoplay:about-built` is set; does not set it under reduced motion (mocked `matchMedia`); does not throw when `sessionStorage` throws. Verify they fail.
- [x] 2.2 [engineer] Create `prepaint.ts` exporting `ABOUT_BUILD_KEY`, `REDUCED_MOTION_QUERY`, `shouldAutoplay(storage, media)`, and `PREPAINT_SCRIPT` (a `<script>` string built from those constants, body in `try/catch`). Verify 2.1 passes.
- [x] 2.3 [engineer] In `src/routes/about/+page.svelte`, render `{@html PREPAINT_SCRIPT}` in `<svelte:head>` (import from `$lib/features/core` after adding it to `about/index.ts` and `core/index.ts`). Verify 1.3 passes.

## 3. Step planner (parallel-safe)

- [x] 3.1 [engineer] Write `plan.test.ts` with stub target descriptors: `TEAM` has nine agents, triage first, join offsets ~1000 ms apart; `planSteps` gives each section scan → target steps → review; nested targets get no frame; fillable targets get `check`, testable get `test`, the repo link gets `secure`; `isReady` blocks a section's scan until the previous section has a done frame, a step until its predecessor and parent frame are done, and review until all section steps are done; `pickStep` follows role priority. Verify they fail.
- [x] 3.2 [engineer] Create `plan.ts` with `TEAM`, `HANDOFF`, the `BuildTarget` and `Step` types, `planSteps`, `isReady`, `pickStep` (pure, no DOM). Verify 3.1 passes.

## 4. Build controller

- [x] 4.1 [engineer] Write `build.svelte.test.ts` with fake timers, injected `requestAnimationFrame`, stub targets, and a stub work map: autoplay starts on first visit and writes the flag; second visit (flag set) stays `done` with Replay; reduced motion (mocked `matchMedia`) never auto-starts but `replay()` starts; `sessionStorage` throwing still starts and does not throw; `skip()` sets `done`, clears every timer and rAF (no pending fake timers, `cancelAnimationFrame` called), and removes `data-build-state`; `destroy()` mid-run leaves no pending timer or rAF and removes listeners; `visibilitychange` to hidden requests no rAF until visible; agents join in `TEAM` order; a wheel event on the scroll container sets `isFollowing` false for the rest of the run; a completed run labels "Built by 9 agents in N.Ns". Verify they fail.
- [x] 4.2 [engineer] Create `build.svelte.ts` with `AboutBuild` (`#private` run token, timers set, rAF id; `$state` phase, joined, stepsDone, elapsedMs, isFollowing; `$derived` progress and hudLabel; `start`, `skip`, `replay`, `destroy`, `shouldAutoplay`), injectable clock, the single rAF loop with batched reads then writes, visibility pause, follow-scroll on `root.closest("main")` (design §5), and `setupAboutBuild` / `getAboutBuild` context helpers. Verify 4.1 passes.
- [x] 4.3 [engineer] Write a `work.test.ts` case first: running `test`, `secure`, and `review` against a stub link records no `click` event on it and no `dispatchEvent` call. Then create `work.ts` with `WORK` (one function per step kind) and `ASSISTS` (design §3), cancellable `sleep` / `tween`, mobile reductions (§6), and the end-of-run gather and leave. Verify with `pnpm test`.

## 5. Build components

- [x] 5.1 [engineer] Write tests in `typed.svelte.test.ts` and `readout.svelte.test.ts` first: outside a build, `Typed` renders plain text and `Readout` the final value; under build, `Typed` keeps its full text node and accessible name unchanged, hides the untyped rest with a highlight range, and its caret is `aria-hidden`, and `Readout` keeps a fixed-width `tabular-nums` box. Then create `typed.svelte` and `readout.svelte` reading `getAboutBuild()`. Verify with `pnpm test`.
- [x] 5.2 [engineer] Write `hud.svelte.test.ts` first: Skip is a button reachable by Tab before page links, activating it ends the run with final content, the label becomes Replay; Escape skips a running build and does nothing once done; Skip carries `aria-keyshortcuts="Escape"`; the HUD has no `aria-live` and no `role="status"`. Then create `hud.svelte` (logic and wiring only; designer styles in 6.9). Verify with `pnpm test`.
- [x] 5.3 [engineer] Create `overlay.svelte`: one `aria-hidden` layer for cursors, marquee, guides, redline, region, badges, bubbles, panels, clipped to `<main>`'s scroll area on all four sides (design §6). Add an `about.svelte.test.ts` case that the overlay is `aria-hidden` and each heading's accessible name is its final text during a run. Verify with `pnpm test`.

## 6. Sections and visuals

- [x] 6.1 [designer] `about.svelte` structure: `.about-root` wrapper with `setupAboutBuild`, `Overlay`, the hero, the HUD in a `data-build-section="status"` block directly below it, the other sections in spec order with `aria-labelledby`, `data-build` / `data-build-id` targets per the prototype's `data-b` map, and the pre-paint CSS (`html[data-about-build="pending"] .about-root` opacity 0 with the 3 s reveal keyframe). Verify 1.1 passes.
- [x] 6.2 [designer] Hero: seat-color wordmark `h1` via `Typed`, scoreboard strip of four `Readout`s divided by tick hairlines, and the tic-tac-toe board as `hero-board.svelte` (draw-target paths, seat-0 → seat-1 win gradient, breathing win line under `motion-safe`). Verify at 360x640 and 1280x800 with no horizontal scroll.
- [x] 6.3 [designer] Who I am and Why this?: monogram and bio; React → Svelte 5 as a unified diff (`-` pink, `+` cyan, gutter numbers); `// carried over` list; Why this? as a ruled sheet with mono labels, one column below `sm`. Verify `pnpm check`.
- [x] 6.4 [designer] Highlights: eight instrument readouts with tick scale and needle, `0.1443 → 0` for layout shift, two columns below `sm`, four from `lg`, separated by tick rules. Verify no box overflow with `node .agents/scripts/layout-shift.mjs /about --overflow`.
- [x] 6.5 [designer] How it's built: pipeline track with numbered nodes and owners, Approval as the only pink node labelled Nikko, traveling token (`transform` only, `motion-reduce` rests on Approval), horizontal from `md`, vertical below. Verify 1.1's pipeline test passes.
- [x] 6.6 [designer] What I learned and Timeline: large quote, eight numbered decision records on a left rule; git-graph rail with seat-alternating commit dots, date, mono short hash, and a dashed Jul 16 → Nov 2 gap segment. Verify 1.1's timeline test passes.
- [x] 6.7 [designer] What's next and credit: tasks.md-style list with decorative `aria-hidden` unchecked boxes and `next` / `later` tags; credit heading, repo link (name "Source on GitHub", mono `nikkoabucejo/twoplay`, "(opens in a new tab)" sr-only), "Take the tour" link. Verify 1.1's repo and tour tests pass.
- [x] 6.8 [designer] Build visuals in `about.svelte` / `overlay.svelte` styles: pending (`data-build-state="pending"`: invisible, nothing painted until built, no size change), fill wipe (`clip-path`), framed, painted, popped states; agent cursor with name tag and action; marquee with W×H; guides; redline; region; badge; bubble; font-size and color panels. Only `transform`, `opacity`, `clip-path`. Verify with `node .agents/scripts/layout-shift.mjs /about` (after 7.1).
- [x] 6.9 [designer] HUD styling: in-flow build bar under the hero, built by the agents, roster dots, fixed-width label and button slot, progress bar via `scaleX`, ≥ 44 px touch target, visible focus ring, Escape skips. Verify with `node .agents/scripts/layout-shift.mjs /about`.

## 7. Layout-shift tooling (parallel-safe)

- [x] 7.1 [engineer] In `.agents/scripts/layout-shift.mjs`, add a `--wait=<ms>` option that replaces the fixed 6000 ms wait, so `/about` can be measured through the build (`--wait=45000`). Verify `node .agents/scripts/layout-shift.mjs /about --wait=45000` reports a score.

## 8. Verification

- [x] 8.1 [engineer] `pnpm test` passes.
- [x] 8.2 [engineer] `pnpm check` reports 0 errors and 0 warnings.
- [x] 8.3 [engineer] `pnpm format:check` passes.
- [x] 8.4 [engineer] `pnpm build` succeeds, and `curl` of `/about` from `pnpm preview` contains every section heading, final body text, one `h1`, the pre-paint script, and no agent cursor markup.
- [x] 8.5 [engineer] `node .agents/scripts/layout-shift.mjs /about --wait=45000` is ≤ 0.01 at 360x640 and 1280x800.
- [x] 8.6 [engineer] Live QA in `browser-a` (1280x800) and `browser-b` (360x640): first visit builds with no flash of final content, triage joins first, follow-scroll starts after the hero review and runs to the bottom on one eased constant-speed curve, agents only work inside the view plus look-ahead and assist when idle so most cursors stay visible and busy, and stops on wheel/touch, no click tick plays during the run, the run ends with "Built by 9 agents in Ns"; reload shows the final page with Replay; Replay restarts from the top; Skip ends the run at once; navigating away mid-run leaves no overlay; hidden tab pauses; reduced motion shows the final page, still pipeline token and board, and Replay works; with JavaScript disabled on a first visit the content appears within 3 s.
