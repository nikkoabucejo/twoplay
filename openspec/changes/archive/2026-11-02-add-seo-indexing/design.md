## Context

`polish-app-shell` added `Meta` (`src/lib/components/ui/meta`): title, description, and `og:title/description/type/image`, with the image URL built from `page.url.origin`. It is used on all 7 routes. `static/robots.txt` is the scaffold allow-all. Data on every page is auth-gated and loaded client-side, so crawlers see page shells only. adapter-auto, SSR on, and `hooks.server.ts` runs Clerk on every request.

## Goals / Non-Goals

**Goals:** a correct index of `/` and `/play`, nothing else indexed, full social cards, structured data on `/`, and real crawlable text on `/`.

**Non-Goals:** public leaderboard/lobby data, SSR data loads, per-room OG images, prerendering, env-configured origin.

## Decisions

### One SEO module: `src/lib/utils/seo`

Exports `SITE_URL = "https://twoplay.xyz"`, `INDEXED_PATHS = ["/", "/play"]`, `isIndexable(url: URL)` (origin equals `SITE_URL` and pathname is in `INDEXED_PATHS`), `canonicalUrl(pathname)`, `robotsTxt()`, `sitemapXml()`, `landingJsonLd()`, and `serializeJsonLd(data)`. Pure functions, unit-tested in node. The endpoints and `Meta` only call into it, so the sitemap and the noindex rules can't drift apart.

Alternative: a `noindex` prop on each route's `Meta`. Rejected because it duplicates the indexed list that the sitemap also needs.

### `Meta` derives indexing from the URL

`Meta` reads `page.url`. When `isIndexable` holds, it renders the canonical link and `og:url`. Otherwise it renders `<meta name="robots" content="noindex">`. That covers rooms, `/history`, `/lobby`, `/leaderboard`, preview deployments, and localhost with no per-route change. `og:image` uses `SITE_URL`, so previews share the production image URL. New optional prop `jsonLd?: Record<string, unknown>`, rendered with `{@html}` inside `<svelte:head>` after `serializeJsonLd` escapes `<` as `<`.

Existing `Meta` tests mock `https://twoplay.example`. They switch to `https://twoplay.xyz` for indexable cases and keep a foreign origin for the preview case.

### Dynamic `robots.txt` and `sitemap.xml`

`src/routes/robots.txt/+server.ts` and `src/routes/sitemap.xml/+server.ts` return `robotsTxt()` / `sitemapXml()` with the right content type and a `cache-control: public, max-age=3600`. `static/robots.txt` is deleted (the route and the static file would conflict). Not prerendered: the hook calls Clerk on every request, and a dynamic response is cheap. robots.txt disallows nothing. Rooms rely on `noindex`, because a `Disallow` would stop crawlers from ever reading that tag.

### Landing content

Signed-out visitors see the game picker (name and emblem, linking to `/play?game=<type>`) above the sign-in prompt, plus a one-line description. Signed-in visitors see it unchanged. `/play` already renders a shell for signed-out visitors, so the links work. The designer owns the layout and copy.

## Risks / Trade-offs

- Hardcoded origin: a domain change means editing one constant. Accepted per the user's choice.
- Leaderboard and lobby are not indexed until they show content signed out. They can be revisited with public queries later.
- `{@html}` JSON-LD is only used for server-built constants, never user input, and is escaped anyway.

## Impact on callers

All 7 route pages use `Meta` through the `$lib/components/ui` barrel. The props stay backward compatible (`jsonLd` is optional), so only `(games)/+page.svelte` changes. The other six are unaffected because indexing is derived from the URL.
