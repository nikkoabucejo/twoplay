# Proposal

## Why

`/about` tells the story of a project built by nine agents and one engineer, but it shows it as generic boxes and cards. The page should show how it was built: the agents build the page live on the first visit, and every section is drawn in the project's own language (diffs, specs, pipelines, git history, seat colors).

## What Changes

- Rewrite `About` (`src/lib/features/core/about/about.svelte`) with new content as static constants: Hero, Who I am, Why this?, Highlights, How it's built, What I learned, Timeline (with short commit hashes), What's next, and the Made by credit with the repo link.
- Replace each card grid with a treatment drawn from the subject: a code diff for React to Svelte 5, instrument readouts for metrics, a pipeline track with a traveling token, decision-record lessons, a git-graph timeline, an open-change task list for the roadmap, and a hero board the agents draw.
- Add a client-only "agent build" overlay: nine named agent cursors join one at a time and build the already-rendered page section by section (scan, frame, fill, type, size, paint, pop, line, draw, verify, click-test, audit, review), with a HUD, Skip, and Replay.
- The build auto-plays only on the first visit to `/about` in a browser session, never under reduced motion. Later visits show the final page with Replay.
- The server-rendered HTML always holds the complete final page. A pre-paint head check hides the content (opacity only) on a first visit so the build starts without a flash of final content.
- Drop the "Under the hood" card grid; its points move into Highlights. Keep one `/tour` link, beside the credit.

Out of scope: other info pages, the footer, SEO paths and the sitemap, any Convex code, new dependencies.

## Capabilities

### New Capabilities

- `about-build`: the live agent build overlay on `/about`: when it plays, Skip and Replay, follow-scroll, and its accessibility and teardown behavior.

### Modified Capabilities

- `info-pages`: the About page requirement changes its sections (adds Who I am, Highlights, How it's built, What I learned, What's next; drops Under the hood).
- `ui-accessibility`: Reduced motion adds the About build (never auto-plays) and the About page's ambient animations.
- `layout-stability`: Stable page load adds `/about`, measured with the build running.

## Impact

- Code: `src/lib/features/core/about/` (`about.svelte`, new build controller and overlay files, tests), `src/routes/about/+page.svelte` and `page.svelte.test.ts`.
- Exports: `About`, `REPO_URL`, `TIMELINE` keep their names. `TIMELINE` entries gain a `hash` field.
- No Convex, schema, auth, or trust-boundary change. No new public Convex function. No new dependency.
