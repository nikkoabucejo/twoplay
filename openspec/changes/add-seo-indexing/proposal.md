## Why

Pages have titles, descriptions, and basic Open Graph tags, but nothing tells search engines which URL is canonical, which pages to index, or what the site is. Private and ephemeral pages (game rooms, history) are indexable, there is no sitemap, social cards lack the large Twitter preview, and the landing page has almost no text a crawler can read.

## What Changes

- A single SEO source of truth: production origin `https://twoplay.xyz` and the list of indexed paths (`/`, `/play`).
- `Meta` adds a canonical link, `og:url`, `og:site_name`, `og:locale`, `og:image` size/alt, Twitter `summary_large_image` tags, and an absolute image URL on the production origin.
- `Meta` renders `robots: noindex` on every page that is not an indexed path, and on any host that is not the production origin (previews, localhost).
- Optional JSON-LD on `Meta`. The landing page emits `WebSite` and `WebApplication` structured data.
- `robots.txt` and `sitemap.xml` served from `+server.ts` endpoints built from the same source of truth. The static `robots.txt` is removed.
- The landing page renders the game list and a short description for signed-out visitors, so crawlers see real content and internal links to `/play`.

Out of scope: public Convex queries or server-side data loading (leaderboard and lobby stay auth-gated and noindexed), dynamic per-room OG images, prerendering, a `PUBLIC_SITE_URL` env var, `X-Robots-Tag` headers.

## Capabilities

### New Capabilities

- `search-indexing`: canonical URLs, indexing rules, robots.txt, sitemap, social cards, structured data, crawlable landing content.

### Modified Capabilities

None. `site-metadata` (from `polish-app-shell`) keeps its requirements; this change adds to them in a separate capability.

## Impact

- `src/lib/utils/seo/` (new), `src/lib/components/ui/meta/`, `src/routes/(games)/+page.svelte`, `src/routes/robots.txt/+server.ts` and `src/routes/sitemap.xml/+server.ts` (new), `static/robots.txt` (removed).
- No schema change, no auth or trust-boundary change, no new public Convex function.
- Depends on `polish-app-shell` (the `Meta` component and `static/og.png`).
