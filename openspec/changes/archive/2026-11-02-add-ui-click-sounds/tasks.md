# Tasks

No server work: this change touches no file under `convex/`.

## 1. Click module [engineer]

- [x] 1.1 [engineer] Write `src/lib/utils/sound/click.test.ts` first, with a fake `EventTarget`, fake events, and a fake `AudioContext` (as in `index.test.ts`): "Button click", "Click inside a control", "Keyboard activation" (a trusted click on a focused button), and "Non-interactive click" for `bindClickSounds`; "Disabled control", "Scripted click" (`isTrusted: false`), inert, and `data-sfx="off"` ancestors stay silent; `isEnabled() === false` stays silent ("Click sounds off"); cleanup removes the listener; "Tick shape" (one triangle or sine oscillator in C major, gain ramps from 0 to at most 0.08 and back near 0, `stop` within 0.04s, routed to master); "Muted page creates no audio context" (sound off or volume 0 via `configureSound` means `playClickSound` creates no context). Then implement `playClickSound`, `CLICKABLE`, `shouldTick`, and `bindClickSounds` in new `src/lib/utils/sound/click.ts`, and export `bindClickSounds` and `playClickSound` from `src/lib/utils/sound/index.ts`. Verify: tests fail first, then pass.

## 2. Preference and wiring [engineer]

- [x] 2.1 [engineer] In `src/lib/utils/storage/preferences/preferences.svelte.test.ts`, write "Click sounds default on", "Click sounds choice survives reload", "Invalid click sounds value ignored", and "Click sounds change keeps other fields" first. Then append `uiSounds` to `Preferences`, `DEFAULT_PREFERENCES` (true), `parsePreferences` (boolean, else default), the store's `$state`, the constructor, and `#write()` in `preferences.svelte.ts`, and add `setUiSounds`. In `src/routes/+layout.svelte`, keep `const preferences = setupPreferences();` and add `$effect(() => bindClickSounds(document, () => preferences.uiSounds))` after the music binding. Verify: new and existing preference tests pass, and `pnpm check` reports 0 errors.

## 3. Settings row and board opt-outs [designer]

- [x] 3.1 [designer] In `src/lib/features/core/settings/settings.svelte.test.ts`, write "Switch toggles the preference" (turning off "Click sounds" sets `uiSounds` false and shows unchecked) and "Switch disabled while Sound is off" first. In `tictactoe.svelte.test.ts` and `checkers.svelte.test.ts`, assert a board cell has a `[data-sfx="off"]` ancestor ("Board cell"). Then add a "Click sounds" row after "Background music" in `settings.svelte` (`row("ui-sounds", "Click sounds", "A soft tick on buttons and links.")`, `Switch id="ui-sounds"`, `checked={preferences.uiSounds}`, `onCheckedChange={(value) => preferences.setUiSounds(value)}`, `disabled={!preferences.sound}`), and add `data-sfx="off"` to the classic `data-board-grid` group and each `miniBoard` group in `src/lib/features/play/tictactoe/tictactoe.svelte`, the `data-board-grid` group in `src/lib/features/play/checkers/checkers.svelte`, and a `<div class="contents" data-sfx="off">` around the boards in `src/lib/features/core/rules/practice-board.svelte`. Verify: tests fail first, then pass.

## 4. Verification

- [x] 4.1 `pnpm test`
- [x] 4.2 `pnpm check` (0 errors, 0 warnings)
- [x] 4.3 `pnpm format:check`
- [x] 4.4 `pnpm build`
- [x] 4.5 Live QA in browser-a: header links, dock, Settings switches and tabs, and dialog buttons tick, by mouse and by Tab plus Enter/Space; plain text does not; disabled buttons do not; a tic-tac-toe or checkers cell and a How to play practice cell play only the move sound; turning Click sounds off silences ticks; Sound off and volume 0 silence them and disable the switch; the choice survives reload; with music on, ticks sit under move sounds and the turn chime.
