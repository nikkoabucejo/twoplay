## 1. Server redirect

- [x] 1.1 [engineer] Write `src/routes/play/page.server.test.ts` (mock `ConvexHttpClient` and `locals.auth`): redirects 307 to `/chess/ABCD` for an active room, redirects for a waiting room, returns without redirecting for no room, skips Convex when signed out, and returns without redirecting when `getToken` or the query throws
- [x] 1.2 [engineer] Add `src/routes/play/+page.server.ts`: token from `locals.auth`, `rooms.active` through `ConvexHttpClient`, `redirect(307, "/<type>/<code>")` thrown outside the try/catch

## 2. Client view

- [x] 2.1 [engineer] Update `src/lib/features/core/play/active-room.test.ts`: a room not started here returns `checking` plus a redirect at seat counts undefined, 1 and 2; the started-here cases are unchanged; no `playing` kind
- [x] 2.2 [engineer] Update `src/lib/features/core/play/play.svelte.test.ts`: an active room on load shows the skeleton, renders no Playing card, and calls `goto` with the room path; the queued-match redirect test still passes
- [x] 2.3 [engineer] Change `playView` in `src/lib/features/core/play/active-room.ts` and remove the `playing` branch and the `Playing` import from `src/lib/features/core/play/play.svelte`

## 3. Verification

- [x] 3.1 `pnpm test`, `pnpm check`, `pnpm format:check`, `pnpm build`
- [x] 3.2 Live QA (browser-a + browser-b): with a filled room, and with a waiting room, open /play from the nav and from the URL bar; check that the game route loads with its own skeleton and no /play card or skeleton; with no room, /play renders the setup (blocked: all four browser profiles held by other sessions; layout-shift script: /play score 0)
