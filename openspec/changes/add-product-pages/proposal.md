# Proposal

## Why

The app has no error page, no rules, no personal stats, no settings, and no about or legal pages. Players who hit a bad link, want to learn a game, or want to mute sounds have nowhere to go.

## What Changes

- `src/routes/+error.svelte`: a branded 404 and error page with New game (`/play`) and Lobby (`/lobby`) buttons.
- `/how-to-play` and `/how-to-play/[game]`: rules for each game in `GAMES`, with small diagrams. Tic-tac-toe covers the board-choice rule as the engine enforces it, winning boards, and clocks. Checkers covers forced captures, multi-jumps, crowning, and clocks. An unknown game is a 404.
- `/me` (My stats, self only): rating and rank, record per game, recent rounds, and an Account button that opens the Clerk profile. It reads the existing `ratings.mine`, `ratings.top`, `rooms.stats`, and `rooms.history` queries.
- `/settings`, saved in the browser: sound on/off and volume, your-turn alert on/off, reduced motion (follow the system or always reduce), and new-game defaults (opponent, clock). Sound and volume drive `utils/sound`. Always reduce sets a root class that `motion-safe`/`motion-reduce` and a global animation reset honor.
- `/about`, `/privacy`, `/terms`. Privacy and terms are plain-language drafts marked "Draft · needs review".
- Footer: How to play, About, Privacy, and Terms on the left, Support on the right. The copyright is removed.
- Avatar menu: My stats, Settings, Account, Sign out.
- `Meta` (title, description) on every new route. The rules, About, Privacy, and Terms pages are indexed and listed in the sitemap. `/me` and `/settings` stay `noindex`.

Out of scope:

- The invite landing page and a changelog.
- The Play page reading the new-game defaults. `polish-new-game` owns `features/core/play`.
- Reduced motion for JS-driven animation in files this change doesn't own (`Board`'s `matchMedia`, `svelte/motion` `prefersReducedMotion` in game icons, Svelte transitions).
- Any Convex, schema, or auth change.

## Capabilities

### New Capabilities

- `error-pages`: the branded not-found and error page.
- `how-to-play`: per-game rules pages.
- `player-stats`: the signed-in player's own stats page.
- `info-pages`: About, Privacy, and Terms.

### Modified Capabilities

- `user-preferences`: new fields (volume, turn alert, motion, new-game defaults), the settings page, and preferences that drive sound and motion.
- `app-navigation`: the avatar menu gains My stats and Settings, and the footer gains How to play, About, Privacy, and Terms.
- `turn-alerts`: the alert is skipped when the your-turn alert preference is off.
- `search-indexing`: the rules, About, Privacy, and Terms pages join the indexed paths and the sitemap.

## Impact

- New routes: `src/routes/+error.svelte`, `src/routes/{how-to-play,how-to-play/[game],me,settings,about,privacy,terms}/`.
- New features: `src/lib/features/core/{rules,stats,settings}/` and lines in `src/lib/features/core/index.ts`.
- Edited: `src/lib/utils/storage/preferences/*`, `src/lib/utils/sound/*`, `src/lib/components/layout/footer/*`, `src/lib/components/layout/header/header.svelte` (+ test), `src/lib/features/presence/turn-alert/turn-alert.svelte.ts` (+ test), `src/routes/layout.css` (+ test), `src/lib/utils/seo/index.ts` (+ test).
- No schema change, no new Convex function, no auth or trust-boundary change.
