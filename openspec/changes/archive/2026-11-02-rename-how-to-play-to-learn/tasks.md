# Tasks

## 1. Redirect and route move

- [x] 1.1 [engineer] Write a failing Vitest test `src/routes/how-to-play/[...path]/server.test.ts`: GET with `path=""` → 308 `Location: /learn`; `path="checkers"`, search `?x=1` → 308 `Location: /learn/checkers?x=1`.
- [x] 1.2 [engineer] `git mv src/routes/how-to-play src/routes/learn` (index, `[game]/+page.ts`, tests), then add `src/routes/how-to-play/[...path]/+server.ts` that redirects; 1.1 passes.
- [x] 1.3 [engineer] Update `src/lib/utils/seo/index.ts` `INDEXED_PATHS` and its tests (`seo/index.test.ts`), `src/routes/sitemap.xml/server.test.ts`, `src/lib/utils/navigation/routes/index.test.ts`, and `.agents/scripts/layout-shift.mjs` to `/learn` paths; `pnpm test` covers it.

## 2. Copy and links

- [x] 2.1 [designer] Update tests first: `src/routes/learn/page.svelte.test.ts` (heading `Learn`, title `Learn · twoplay`, links `/learn/<game>`), `src/routes/learn/[game]/page.svelte.test.ts` (`Learn Checkers`), `footer.svelte.test.ts` (label "Learn", href `/learn`), `src/routes/tour/page.svelte.test.ts` (`/learn/<game>` hrefs), and `tictactoe.svelte.test.ts` (a "Learn the rules" link to `/learn/tictactoe`).
- [x] 2.2 [designer] Update `src/routes/learn/+page.svelte` and `[game]/+page.svelte` titles, `footer.svelte`, `tour.svelte` (button "Learn", `/learn`), `rules/door.svelte` (`/learn/{type}`), `tictactoe.svelte` (popover link "Learn the rules" → `/learn/tictactoe`), and the `rules/rules.ts` descriptions ("Learn <Game> on twoplay: …"); 2.1 passes.

## 3. Verification

- [x] 3.1 `grep -rni "how.to.play" src .agents/scripts` returns only the redirect endpoint and its test.
- [x] 3.2 `pnpm test`, `pnpm check`, `pnpm format:check`, and `pnpm build` pass.
- [x] 3.3 Live QA: footer "Learn" → `/learn`, the Tour button, door cards → `/learn/<game>`, the tic-tac-toe popover link, `/how-to-play/checkers` lands on `/learn/checkers`, and `/learn/chess` returns 404. (checked by curl + Vitest; live browsers blocked: profiles held by other sessions)
