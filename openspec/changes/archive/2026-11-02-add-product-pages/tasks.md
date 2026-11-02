# Tasks

## 1. Preferences fields (after polish-new-game group 1)

Starts after `polish-new-game` group 1 has landed its private `#write()`, `lastPlay`, and `setLastPlay` in `preferences.svelte.ts`. Build on that writer; add no second one.

- [x] 1.1 [engineer] In `src/lib/utils/storage/preferences/preferences.svelte.test.ts`, add tests for: the new defaults (Fresh browser), out-of-range volume and invalid `motion`/`newGameOpponent`/`newGameClock` falling back per field while valid fields (including `lastPlay`) are kept (Out-of-range volume), and each new setter persisting its field across a new `PreferencesStore` on the same storage without dropping the others. Verify they fail.
- [x] 1.2 [engineer] In `src/lib/utils/storage/preferences/preferences.svelte.ts`, add `volume`, `turnAlert`, `motion`, `newGameOpponent`, `newGameClock` to the `Preferences` type, the defaults, `parsePreferences` (one validated line each), the `$state` fields, and `#write()`, plus `setVolume`, `setTurnAlert`, `setMotion`, `setNewGameOpponent`, `setNewGameClock`, each assigning and calling `#write()`. Export the option lists (`MOTION_OPTIONS`, `NEW_GAME_OPPONENTS`, `NEW_GAME_CLOCKS`) from `preferences/index.ts` and `storage/index.ts`. Append only; leave B's `lastPlay` lines as they are. Verify 1.1 passes.

## 2. Sound volume and mute (parallel-safe)

- [x] 2.1 [engineer] In `src/lib/utils/sound/index.test.ts`, add tests: with `configureSound({ isEnabled: false, volume: 1 })` no `AudioContext` is created and no oscillator starts (Sound off silences moves), volume 0 behaves the same, and with volume 0.4 the master gain is set to 0.4 and every oscillator chain connects to it (Volume scales output). Verify they fail.
- [x] 2.2 [engineer] In `src/lib/utils/sound/index.ts`, add `configureSound`, a master `GainNode` created with the context, route `playMoveSound`, `playCaptureSound`, and `playTurnChime` through it, and return early when disabled or at volume 0. Export it from the barrel if one is added. Verify 2.1 passes.

## 3. Apply preferences to sound and motion

- [x] 3.1 [engineer] In `preferences.svelte.test.ts`, add `applyPreferences` tests under `$effect.root` with a fake `configureSound` and a fake root element: it pushes `{ isEnabled, volume }` on start and on change, and toggles `reduce-motion` for `motion: "reduce"` and removes it for `"system"`. Verify they fail.
- [x] 3.2 [engineer] In `preferences.svelte.ts`, add `applyPreferences(store, deps)` and call it from `setupPreferences()` with `configureSound` and `document.documentElement` (browser only). Verify 3.1 passes.
- [x] 3.3 [engineer] In `src/routes/layout.css.test.ts`, add tests that `layout.css` declares `@custom-variant motion-safe` and `motion-reduce` referencing `.reduce-motion`, and a `.reduce-motion` rule that shortens `animation-duration` and `transition-duration`. Verify they fail.
- [x] 3.4 [engineer] In `src/routes/layout.css`, add the two `@custom-variant` overrides and the `.reduce-motion` reset (0.01ms durations, `!important`). Verify 3.3 passes and a `Skeleton` stops pulsing with the class set (Always reduce on a full-motion system, Follow the system) in live QA.

## 4. Turn alert preference (after 1)

- [x] 4.1 [engineer] In `src/lib/features/presence/turn-alert/turn-alert.svelte.test.ts`, add a test: with `preferences.turnAlert` false, a hidden-tab turn arrival leaves the title unchanged and plays no chime (Alert turned off). Verify it fails.
- [x] 4.2 [engineer] In `turn-alert.svelte.ts`, widen `TurnAlertDeps.preferences` to `Pick<Preferences, "sound" | "turnAlert">` and skip the alert when `turnAlert` is off. Verify 4.1 and the existing tests pass.

## 5. My stats (`/me`)

- [x] 5.1 [engineer] Create `src/lib/features/core/stats/stats.test.ts` with tests for `rankOf` (third row `isMe` gives 3, absent gives `null`), `recordByGame` (Record splits by game, `playing` skipped), and `recentRounds` (12 rounds give 10, newest first, `href` `/<type>/<code>/<round>`). Verify they fail.
- [x] 5.2 [engineer] Create `src/lib/features/core/stats/stats.ts` with those three functions typed from `RoomHistoryEntry` and `LeaderboardEntry`. Verify 5.1 passes.
- [x] 5.3 [engineer] Create `src/lib/features/core/stats/stats.svelte` data wiring: `ratings.mine`, `ratings.top`, `rooms.stats`, `rooms.history`, each `"skip"` when signed out. Add `stats/index.ts` and a line in `src/lib/features/core/index.ts`. Verify with `pnpm check`.
- [x] 5.4 [designer] In `stats.svelte`, lay out rating and rank (`#N` or "Unranked"), totals and win rate, a record row per game from `GAMES`, the recent-rounds list or `EmptyState`, an Account button (`auth.openUserProfile()`), and the signed-out Sign in prompt. Use sized `Skeleton`s, `tabular-nums` fixed-width numbers, and `text-caption`. Create `src/routes/me/+page.svelte` with `Meta` ("My stats") and `Page`. Verify in live QA (Signed out, Ranked player, Unranked player, Account opens the profile, Stats title).

## 6. How to play

- [x] 6.1 [engineer] Create `src/routes/how-to-play/[game]/page.test.ts` testing the `load` in `+page.ts`: `tictactoe` and `checkers` return the game, `chess` throws a 404 (Unknown game slug). Verify it fails.
- [x] 6.2 [engineer] Create `src/routes/how-to-play/[game]/+page.ts` that checks `params.game` against `GAMES` and throws `error(404)` otherwise. Verify 6.1 passes.
- [x] 6.3 [designer] Create `src/lib/features/core/rules/` (`rules.ts` with `RULES: Record<GameType, GameRules>`, `rules.svelte`, small diagram components, `index.ts`, line in `features/core/index.ts`). Tic-tac-toe copy follows the engine: nine boards, can't replay last turn's board unless it is the only open one, three won boards in a line, full grid is a draw, clocks. Checkers: diagonal moves, forced captures, multi-jumps (also after crowning), crowning on the far row, no legal move loses, clocks. Diagrams use `seat-N` tokens and are `aria-hidden` with text alternatives in the copy. Verify with `pnpm check`.
- [x] 6.4 [designer] Create `src/routes/how-to-play/+page.svelte` (index linking each game, `Meta` "How to play") and `src/routes/how-to-play/[game]/+page.svelte` (`Meta` "How to play <Game>", `Page`, rules, Play button to `/play`). Verify in live QA (Index lists both games, Tic-tac-toe rules, Checkers rules, Checkers rules title).

## 7. Settings (`/settings`)

- [x] 7.1 [designer] Create `src/lib/features/core/settings/` (`settings.svelte`, `index.ts`, line in `features/core/index.ts`) with labeled controls bound to `getPreferences()` through its setters: sound switch, volume slider (disabled while sound is off), turn alert switch, reduced motion choice (Follow system, Always), new-game opponent (Matchmaking, Public, Private) and clock (3, 5, 10 min) from the exported option lists. No save button. Use existing `components/ui` controls (`Tabs`, `Button`) or add a shadcn-svelte `switch`/`slider` under `components/ui` if needed. Verify with `pnpm check`.
- [x] 7.2 [designer] Create `src/routes/settings/+page.svelte` with `Meta` ("Settings") and `Page`. Verify in live QA (Change survives reload, Settings title, sound off silences a move in a room).

## 8. Error, About, Privacy, Terms (parallel-safe)

- [x] 8.1 [designer] Create `src/routes/+error.svelte`: `page.status` 404 shows "Page not found", anything else "Something went wrong", a short message, and New game (`/play`) and Lobby (`/lobby`) buttons. `Meta` with the heading as title. Verify in live QA (Unknown path, Not-found title) and with `curl -s -o /dev/null -w '%{http_code}' localhost:5173/nope` returning 404.
- [x] 8.2 [designer] Create `src/routes/about/+page.svelte` (what twoplay is, both games via `GAMES`, no Ko-fi link), `src/routes/privacy/+page.svelte`, and `src/routes/terms/+page.svelte` (Clerk handles sign-in, game history and ratings are stored, no ads or tracking, visible "Draft · needs review" label). Each with `Meta` and `Page`. Verify in live QA (About renders, Privacy draft, Terms draft, Privacy title).

## 9. Navigation

- [x] 9.1 [designer] Update `src/lib/components/layout/footer/footer.svelte.test.ts`: footer links to `/how-to-play`, `/about`, `/privacy`, `/terms`, and Ko-fi (Footer links), and repeats no href from `NAV_ITEMS`, `/`, `/me`, or `/settings`. Verify it fails.
- [x] 9.2 [designer] In `footer.svelte`, add the four internal links before Support, with `whitespace-nowrap` labels that wrap as whole items at 360px. Verify 9.1 passes.
- [x] 9.3 [designer] In `src/lib/components/layout/header/header.svelte.test.ts`, add a test that the avatar menu has exactly My stats, Settings, Account, Sign out in order, with My stats going to `/me` and Settings to `/settings` (Menu actions). Verify it fails.
- [x] 9.4 [designer] In `header.svelte`, add My stats and Settings `DropdownItem`s that navigate to `/me` and `/settings`, then a separator, Account, Sign out. Widen `DropdownContent` only if a label would wrap. Verify 9.3 passes.

## 10. Search indexing (parallel-safe)

- [x] 10.1 [engineer] In `src/lib/utils/seo/index.test.ts`, update `INDEXED_PATHS` and `sitemapXml` tests to expect `/`, `/play`, `/how-to-play`, `/how-to-play/tictactoe`, `/how-to-play/checkers`, `/about`, `/privacy`, `/terms`; add `isIndexable` cases that accept `/how-to-play/checkers` and `/privacy` and reject `/me`, `/settings`, and `/how-to-play/chess` (Stats and settings are not indexed, Rules and info pages are indexed); add a test that every key of `GAMES` has its `/how-to-play/<game>` entry. Verify they fail.
- [x] 10.2 [engineer] In `src/lib/utils/seo/index.ts`, append the six paths to `INDEXED_PATHS`. Verify 10.1 and `src/routes/sitemap.xml/server.test.ts` pass (Sitemap lists indexed pages only).

## 11. Verification

- [x] 11.1 `pnpm test` passes.
- [x] 11.2 `pnpm check` reports 0 errors and 0 warnings.
- [x] 11.3 `pnpm format:check` passes.
- [x] 11.4 `pnpm build` succeeds.
- [ ] 11.5 Run `.agents/scripts/layout-shift.mjs` on `/me`, `/settings`, `/how-to-play/checkers`, `/about`, and `/nope` at 360px and 1280px; each stays under 0.01.
- [ ] 11.6 Live QA in `browser-a`: every user-visible scenario above, no duplicate hrefs across header, avatar menu, dock, and footer at 360px and 1280px (No duplicate links on mobile, No duplicate links on desktop), every footer link resolves (Footer links resolve), and each new route's title and description. Canonical and `noindex` on the production origin are covered by 10.1.
