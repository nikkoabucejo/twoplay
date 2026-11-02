# Tasks

No server work: this change touches no file under `convex/`.

## 1. Preferences (parallel-safe)

- [x] 1.1 [engineer] Add tests to `src/lib/utils/storage/preferences/preferences.svelte.test.ts` for "Setup survives reload", "Invalid setup ignored", and "Sound change keeps the setup". They fail first.
- [x] 1.2 [engineer] In `preferences.svelte.ts`, append `lastPlay` to `Preferences`, `DEFAULT_PREFERENCES`, and `parsePreferences`. Add a private `#write()` that serializes all fields, plus `setLastPlay()`. Point `setSound` at `#write()`. Export any new type from `index.ts`. This is the first prefs change, and change D appends its fields to `#write()` afterwards (design.md section 8). Verify: 1.1 passes.

## 2. Play logic (parallel-safe)

- [x] 2.1 [engineer] Write tests first. In `src/lib/features/core/play/active-room.test.ts`, test `playView`: checking, one-seat → waiting, two seats loaded fresh → playing with no redirect, two seats with `startedHere` → redirect, queued, pending. In `copy-link.test.ts`, test `shareLink`: success, AbortError is silent, any other error shows the error toast. In a new `elapsed.test.ts`, test that `formatElapsed(75_000)` returns `01:15` and that 0 returns `00:00`.
- [x] 2.2 [engineer] Replace `activeRoomRedirect` with `playView` in `active-room.ts`. Add `shareLink` to `copy-link.ts` and `formatElapsed` to a new `elapsed.ts`. Verify: 2.1 passes.

## 3. /play page

- [x] 3.1 [engineer] In `src/lib/features/core/play/play.svelte.test.ts`, write the component tests first: ArrowRight moves the checked card and its focus, `?game=checkers` (the `initialGame` prop) checks checkers, A friend creates a private room, Create room pending reads "Creating…" and is disabled, Share is hidden without `navigator.share`, Cancel room calls `rooms.abandon`, an active two-seat room renders the `Playing` card with no `goto`, a stored setup is preselected, and while queued "Play a friend instead" cancels and selects A friend. For leaving while queued, test that `unmount` and a `pagehide` event each call `pairings.cancel`. Replace the carousel and `Find Match` selectors in the existing tests.
- [x] 3.2 [designer] Add `game-cards.svelte` (radiogroup, roving tabindex, Arrow/Home/End, `Emblem` and name, disabled while not in setup). Remove `ENTRIES`, `RING_STEP_REMS`, `iconOffsetRem`, and the carousel markup from `play.svelte`.
- [x] 3.3 [designer] Rework `play.svelte` around `playView`. Render `<Page title="Play" titleClass="sr-only">` with cards in the main column and a `sidebar` snippet for opponent Tabs ("Anyone · A friend · Open room" with a one-line `text-caption` hint), clock Tabs, start, the join form, and the status views. Add pending buttons (Spinner with "Finding…" or "Creating…", fixed width, `whitespace-nowrap`). Add the waiting room (Beacon, "Waiting for your opponent…", code, Copy link, Share if available, Cancel room). Add the queue view (Spinner, game and clock, mm:ss timer with `tabular-nums`, "Play a friend instead", Cancel, no `py-13.25`). For an active game, show `Playing` unchanged; change C owns its edits. Seed and save prefs via `getPreferences()` on start. Add the `pagehide` and teardown cancel `$effect`. Simplify `src/routes/play/+page.svelte` to `Meta` plus `<Play {initialGame} />`. Verify: 3.1 passes.
- [x] 3.6 Comet selected state: `selected-ring` utility applied to Tabs, game cards, options
- [x] 3.7 [designer] Visual redesign per user feedback: one compact centered form card (sr-only h1), game and opponent as `choices` radiogroups with `selected-ring`/`hover-ring`, clock Tabs, CTA with summary line, "Have a code?" row; fixes the sidebar overflow

## 4. Verification

- [x] 4.1 `pnpm test`
- [x] 4.2 `pnpm check` (0 errors, 0 warnings)
- [x] 4.3 `pnpm format:check`
- [x] 4.4 `pnpm build`
- [ ] 4.5 Run `.agents/scripts/layout-shift.mjs` on /play at 390px and 1280px across setup → queued → cancel and setup → waiting → cancel room. It must record 0 entries.
- [ ] 4.6 Live QA (browser-a, browser-b):
  - The landing link `?game=checkers` preselects checkers.
  - Arrow keys move between cards.
  - From lg, the layout has two columns.
  - Queue: the timer ticks, Play a friend instead works, and closing the tab removes the entry.
  - Waiting room: Copy link toasts, and Share appears only where supported.
  - When B joins, A is sent to the room.
  - Cancel room abandons the room.
  - Reloading with a live game shows the `Playing` card and does not redirect. The Resume label and Abandon confirmation are checked once change C lands.
  - Choices are remembered after a reload.
  - Under reduced motion, the Beacon does not ping.
- QA: /play "Finding a match" card at 630 and 360: centered, equal padding, no height change across idle, searching, and cancel, 0 layout-shift entries. 4.5 left open (390/1280 widths and the waiting-room flow not run)
