# Tasks

## 1. Game metadata

- [x] 1.1 [designer] Add `description: string` to `GameMeta` and a one-sentence description to each `GAMES` entry in `src/lib/features/play/games.ts`. Verify with `pnpm check`.

## 2. Landing tests

- [x] 2.1 [designer] Rewrite `src/routes/(games)/page.svelte.test.ts` with `convex-svelte` mocked via `fake-convex.svelte.ts`. Test by role and href, never class names: signed-out actions call `auth.signIn` and are disabled on `loadError`; cards link to `/play?game=<type>` with their descriptions in both auth states; "How it works" has three steps signed out and is absent signed in; with `rooms.index.active` set to `{ code: "ABCD", type: "checkers" }` a "Resume your game" link goes to `/checkers/ABCD` and "Quick match" is absent; with `null`, both actions link to `/play`; JSON-LD test kept. Confirm the new tests fail before group 3.

## 3. Home view

- [x] 3.1 [designer] Build `src/lib/features/core/home/` (`home.svelte`, `index.ts`, and `game-card.svelte`, `preview.svelte`, `steps.svelte` as needed), export `Home` from `src/lib/features/core/index.ts`, and make `src/routes/(games)/+page.svelte` render `Meta` + `<Page><Home /></Page>`, following design.md decisions 1–6: wordmark `h1` with its existing glow style, one fixed-height action slot (sign-in actions, `/play` actions, or Resume banner via `liveGameHref`), cards from `GAME_TYPES`/`GAMES` with `aria-hidden` SVG previews in `seat-N` colors, `lg` two-column grid, "How it works" signed out only, `text-caption`, `whitespace-nowrap` labels, transform/opacity-only `motion-safe` hover. Verify that the group 2 tests pass, and that `pnpm check` reports 0 errors and 0 warnings.

## 4. Verification

- [x] 4.1 [designer] Run `pnpm test`, `pnpm check`, `pnpm format:check`, and `pnpm build`. All pass.
- [ ] 4.2 [designer] Screenshot `/` at 360x640 and 1280x800, signed out, signed in with no active room, and signed in with an active room. Check two columns at `lg`, one column and no horizontal scroll at 360, and no wrapped labels.
- [ ] 4.3 Orchestrator runs `.agents/scripts/layout-shift.mjs` on `/` at both viewports, signed out and signed in with an active room. The score must be at most 0.01, with no entries for the cards when the Resume banner appears.
- [ ] 4.4 `qa` in `browser-a`/`browser-b`: signed out, Quick match opens sign-in; signed in, clicking the Checkers card opens `/play` with Checkers selected; start a room in `browser-a`, then load `/` and check that Resume links into it; with reduced motion emulated, nothing animates on hover.
