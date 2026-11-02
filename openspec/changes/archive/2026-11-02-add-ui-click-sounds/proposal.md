# Proposal

## Why

Buttons and links give no audible feedback, while moves do. A soft tick on UI clicks makes the app feel responsive, and players who don't want it can turn it off.

## What Changes

- A soft, short synthesized tick (sine/triangle, about 30–40ms, pitched in C major, quieter than move sounds) plays when the user activates a button, link, switch, tab, menu item, radio, checkbox, or option, by pointer or keyboard.
- Disabled, `aria-disabled`, and inert controls stay silent. Board grids opt out with `data-sfx="off"`, because their cells already play move sounds.
- The tick follows Sound and Volume: no tick while sound is off or volume is 0.
- New preference `uiSounds`, default on, stored with the other preferences.
- A "Click sounds" switch in the Sound section of Settings, after "Background music", disabled while Sound is off.

Out of scope: per-control sounds, hover sounds, a separate click volume, any Convex change.

## Capabilities

### New Capabilities

- `ui-click-sounds`: Which UI activations tick, which stay silent, how the tick follows the sound settings, and its Settings control.

### Modified Capabilities

- `user-preferences`: Adds the `uiSounds` field (ADDED requirement only).

## Impact

- `src/lib/utils/sound/click.ts` (new): `playClickSound` and `bindClickSounds`. `src/lib/utils/sound/index.ts` barrel exports both.
- `src/lib/utils/storage/preferences/preferences.svelte.ts`: `uiSounds` field and `setUiSounds`.
- `src/routes/+layout.svelte`: binds the click listener once at the root.
- `src/lib/features/core/settings/settings.svelte`: new switch row.
- `src/lib/features/play/tictactoe/tictactoe.svelte`, `src/lib/features/play/checkers/checkers.svelte`, `src/lib/features/core/rules/practice-board.svelte`: `data-sfx="off"` on the boards.
- No server, schema, auth, or dependency changes. No new public Convex function.
