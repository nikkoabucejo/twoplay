# Tasks

## 1. Route, indexing, footer

- [x] 1.1 [designer] Tests first: `/sandbox` route renders the Sound then Game headings; seo test has no `/sandbox/sound` and `isIndexable("/sandbox")` is false; sitemap test drops `/sandbox/sound`; footer test expects `/sandbox` (`src/routes/sandbox/page.svelte.test.ts`, `src/lib/utils/seo/index.test.ts`, `src/routes/sitemap.xml/server.test.ts`, `src/lib/components/layout/footer/footer.svelte.test.ts`)
- [x] 1.2 [designer] Move the page to `src/routes/sandbox/+page.svelte`, delete `src/routes/sandbox/sound/`, drop `/sandbox/sound` from `INDEXED_PATHS`, point the footer link at `/sandbox`. Verify: tests in 1.1 pass

## 2. Sandbox sections and game previews

- [x] 2.1 [designer] Tests first: fixtures test asserts the tic-tac-toe win, meta-win, and draw; chess check, checkmate, and promotion-ready pawn; checkers must-capture; result views for win, loss, draw, and timeout (`src/lib/features/core/sandbox/fixtures.test.ts`). Component test: the Sound and Game sections render, the tic-tac-toe strike line shows, the chess check square is labeled "in check", four result cards render, and opening the promotion preview shows Queen, Rook, Bishop, and Knight (`src/lib/features/core/sandbox/sandbox.svelte.test.ts`)
- [x] 2.2 [designer] Build `src/lib/features/core/sandbox/` (`fixtures.ts`, `sandbox.svelte`, `interactions.svelte`, `index.ts`, export from `features/core/index.ts`), reusing the Learn boards, `ResultCard`, `ChessPromotion` (via `ChessBoard`'s `promotion` prop), and the sound lab moved in as `sound.svelte`. Verify: tests in 2.1 pass

## 3. Verification

- [x] 3.1 `pnpm test`, `pnpm check`, `pnpm format:check`, `pnpm build`
- [x] 3.2 Layout-shift script on `/sandbox`, and live QA: sections, promotion picker in both colors, result cards, noindex
