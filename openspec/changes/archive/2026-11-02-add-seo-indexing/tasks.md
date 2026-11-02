## 1. SEO module

- [x] 1.1 [engineer] Test then implement `src/lib/utils/seo/index.ts` (+ `index.test.ts`): `SITE_URL`, `INDEXED_PATHS`, `isIndexable`, `canonicalUrl` (drops query/fragment), `robotsTxt`, `sitemapXml`, `landingJsonLd`, `serializeJsonLd` (escapes `</script`, round-trips)

## 2. Endpoints

- [x] 2.1 [engineer] Test then implement `src/routes/robots.txt/+server.ts` and `src/routes/sitemap.xml/+server.ts` (+ `server.test.ts` each): status, content type, body; delete `static/robots.txt`

## 3. Meta

- [x] 3.1 [engineer] Test then extend `src/lib/components/ui/meta/meta.svelte` (+ `meta.svelte.test.ts`): canonical + `og:url` on indexable URLs, `robots noindex` otherwise (room, history, lobby, leaderboard, foreign origin), `og:site_name`, `og:locale`, `og:image` on `SITE_URL` with width/height/alt, Twitter tags, optional `jsonLd` prop

## 4. Landing page

- [x] 4.1 [designer] `src/routes/(games)/+page.svelte`: pass `landingJsonLd()` to `Meta`, sharpen the description, render the game picker and a one-line site description for signed-out visitors above the sign-in prompt

## 5. Verification

- [x] 5.1 `pnpm test`, `pnpm check`, `pnpm format:check`, `pnpm build`
- [x] 5.2 Live QA: curl `/`, `/play?game=checkers`, `/tictactoe/ABCD`, `/history`, `/robots.txt`, `/sitemap.xml` on the preview server and check tags/bodies; signed-out `/` shows the games in the browser (curl checks passed; browser checks blocked: QA profiles held by another session)
