# Design

## Context

The rules pages live at `src/routes/how-to-play/` (index plus `[game]` with a `+page.ts` that 404s unknown games). Links to them are string literals in `footer.svelte`, `tour.svelte`, `rules/door.svelte`, and `tictactoe.svelte`; there is no route-constant module. `INDEXED_PATHS` in `utils/seo` drives `isIndexable`, `sitemapXml`, `meta.svelte`, and the sitemap route. The value changes and the shape does not, so those callers are unaffected. No redirect mechanism exists today.

The working tree has unrelated uncommitted edits in some of these files (for example `/sandbox/sound` in `INDEXED_PATHS`, and the footer Sandbox link). This change edits on top of them and leaves them alone. The spec deltas describe only this change's paths.

## Goals / Non-Goals

**Goals:** move the pages to `/learn`, rename every user-facing "How to play" to "Learn", and keep old URLs working.

**Non-Goals:** renaming `features/core/rules`, `RULES`, or the room "Rules" popover; adding a shared route-constant module.

## Decisions

- **Move with `git mv src/routes/how-to-play src/routes/learn`** to keep history. Tests move with it.
- **Redirect via `src/routes/how-to-play/[...path]/+server.ts`.** It handles GET and responds `redirect(308, "/learn" + (path ? "/" + path : "") + url.search)`. A rest param also matches the bare `/how-to-play`, so one file covers both. 308 is permanent and keeps the method. Alternative: a check in `hooks.server.ts`. Rejected: it adds per-request logic to a global hook for one legacy prefix. An unknown game redirects first, then 404s at `/learn/<game>`, which is acceptable.
- **Copy:** the index title is "Learn", the game title "Learn {name}", the popover link "Learn the rules", and the descriptions "Learn <Game> on twoplay: …".

## Risks / Trade-offs

- [Search engines still hold `/how-to-play` URLs] → the 308 redirect transfers them. The sitemap lists only `/learn`.
- [A missed literal] → after the edit, `grep -rni "how.to.play" src .agents/scripts` must return only the redirect endpoint.
