# Design

## Context

`src/lib/utils/sound/graph.ts` owns the lazy `AudioContext` and master gain. `getAudibleGraph()` returns null while sound is off or volume is 0, so a muted page never creates a context. `configureSound` (called from `applyPreferences`) keeps those settings current. `src/routes/+layout.svelte` calls `setupPreferences()` and binds `bindMusicLifecycle(document, music)` in a root `$effect`, which persists across navigation. Move sounds (`playMoveSound`, `playCaptureSound`) already play on board cells in `tictactoe.svelte`, `checkers.svelte`, and `practice-board.svelte`.

## Goals / Non-Goals

**Goals:** one listener for the whole app, a pure and testable binder, a tick that sits under move sounds, no per-component edits beyond the board opt-outs.

**Non-Goals:** hover sounds, per-control timbres, a click volume, sounds on sliders or text inputs.

## Decisions

### 1. One delegated capture listener over per-component handlers

- Chosen: `bindClickSounds(target, isEnabled)` adds one capture-phase `click` listener on `document`. Every current and future control ticks without edits. Keyboard Enter and Space on buttons and links dispatch `click`, so pointer and keyboard stay in parity. Capture phase means a handler calling `stopPropagation` cannot swallow the tick.
- Keyboard on switches and menu items: the bits-ui Switch (a `<button role=switch>`) toggles on Enter/Space keydown with `preventDefault`, so no click fires, and menu items forward an untrusted `click()`. A second capture-phase `keydown` listener ticks on trusted, non-repeat Enter/Space whose target is inside `[role=switch], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox]`, with the same gating. Native buttons and links are not in that selector, so they tick once from their click. If a keyboard click (`detail` 0) still reaches the same control after its keydown tick, it is skipped.
- Popup triggers (`[aria-haspopup]:not([aria-haspopup="false"])`: the account and Resign dropdowns, the Confirm, emoji, and Rules popovers): the bits-ui DropdownMenu trigger opens on `pointerdown`, so the click that follows lands on `<html>`, and every bits-ui popup trigger opens on Enter/Space keydown with `preventDefault`. A capture-phase `pointerdown` listener ticks on a trusted primary-button, non-ctrl, non-touch press on a popup trigger, and a pointer click (`detail` above 0) that then lands on the same trigger is skipped. Popup triggers join the keydown selector, and ArrowDown ticks on a closed `menu` or `listbox` trigger that is not itself a menu item. Touch taps tick from their click, since bits-ui opens menus on touch `pointerup`.
- Rejected: an `onclick` in the `Button` primitive. It misses links, bits-ui switches, tabs, and menu items, and every primitive would need the same edit.
- Rejected: `pointerdown` for every control. It fires before activation, ticks on drags and scroll starts, and skips keyboard. It is used only for popup triggers, which act on it.

### 2. Module layout (`src/lib/utils/sound/click.ts`)

- `playClickSound()`: `getAudibleGraph()`, return if null. Ticks closer than 30ms on the audio clock are dropped. One triangle oscillator at G5 (783.99 Hz), detuned at random within ±20 cents, into a gain that ramps 0 → 0.038 in 3ms with `linearRampToValueAtTime`, then `exponentialRampToValueAtTime(0.0001)` by 35ms, `stop` at 40ms. Connects to `master`, so Volume scales it. Peak 0.038 sits under the move sound's body and near the music voices.
- `CLICKABLE = "button, a[href], [role=switch], [role=tab], [role=menuitem], [role=menuitemradio], [role=radio], [role=checkbox], [role=option]"`.
- `tickTarget(event, selector): Element | null` (internal, tested through the binder): requires `isTrusted`, a target `Element`, and `target.closest(selector)`. Returns null when that control is `:disabled`, has `aria-disabled="true"`, or `closest("[inert], [data-sfx=off]")` matches.
- `bindClickSounds(target: Pick<Document, "addEventListener" | "removeEventListener">, isEnabled: () => boolean, play = playClickSound): () => void`: on click, key activation, or a popup trigger's pointerdown, plays when `isEnabled()` and `tickTarget` finds a control. Returns cleanup for all three listeners. `play` is injectable so tests assert calls without audio.
- `index.ts` exports `bindClickSounds` and `playClickSound` by name. `click.ts` imports from `./graph.js`, not the barrel, so there is no cycle.

### 3. Who decides "enabled"

- Chosen: the layout passes `() => preferences.uiSounds`, read at click time. Sound and Volume gating stays in `getAudibleGraph`, the same rule move sounds use. `applyPreferences` gains no effect.
- Rejected: a `configureClickSounds` setter driven from an `$effect` like music. It adds module state for a value that is cheap to read when needed.
- The capture listener runs before the switch's `onCheckedChange`, so turning Click sounds off ticks from the listener and turning it on would be silent. The Click sounds switch calls `playClickSound()` after `setUiSounds(true)`, so both directions tick once. The Sound switch keeps the one-sided behavior.

### 4. Root ownership

`+layout.svelte` keeps the store returned by `setupPreferences()` (`const preferences = setupPreferences();`) and adds `$effect(() => bindClickSounds(document, () => preferences.uiSounds))` next to the music binding. `$effect` never runs during SSR, so `document` is only touched in the browser.

### 5. Board opt-outs

`data-sfx="off"` goes on the board container, not each cell:

- `tictactoe.svelte`: the classic `data-board-grid` group and each `miniBoard` grid group.
- `checkers.svelte`: the `data-board-grid` group.
- `practice-board.svelte`: a `<div class="contents" data-sfx="off">` wrapping the `{#if}` block, since `tictactoe-board.svelte` and `checkers-board.svelte` are also used non-interactively and need no attribute.

Controls around the boards (resign, rematch, emotes, clocks) still tick.

### Trust boundary

No Convex code is touched. Click sounds are client-only, per browser, and stored in `localStorage` like the other preferences. No authentication, room membership check, or server validation is involved.

### Impact on callers

- `PreferencesStore` consumers: `settings.svelte` gains the switch (task group 3). `play.svelte`, `turn-alert.svelte.ts`, and the store built in `checkers.svelte.test.ts` and `play.svelte.test.ts` read other fields, so a new field changes nothing they read.
- `parsePreferences` users: `src/lib/utils/storage/index.ts` and `src/lib/utils/storage/preferences/index.ts` (re-exports) and `play.svelte` (reads `lastPlay`). Unaffected because the return type only gains a field.
- `applyPreferences` / `ApplyDeps`: unchanged.
- `getAudibleGraph` callers in `index.ts`: unchanged. `click.ts` is a new caller.
- `bindMusicLifecycle`: unchanged. It listens for `pointerdown`/`pointerup`/`keydown`, so the two bindings never interfere.
- `Button` primitive and other `src/lib/components/ui` controls: unaffected. They render `button`, `a[href]`, or the listed roles, which the selector already matches.
- Board cells: they keep `playMoveSound`/`playCaptureSound` and gain silence from the container attribute.

## Risks / Trade-offs

- [Tick fatigue on repeated clicks] → 40ms, peak 0.038, a 30ms throttle, ±20 cent detune, and a setting to turn it off.
- [Audio context created on first click] → Only when `getAudibleGraph` allows it, and a click is a user gesture, so autoplay policy is met.
- [A future board forgets `data-sfx="off"` and double-sounds] → The attribute is documented here and in the spec. A board test asserts it for the two games.
- [Label clicks forward a second click to the control] → The `<label>` itself is not in the selector, and the forwarded click on the switch ticks once.

## Migration Plan

None. A missing `uiSounds` field parses to true. Rollback is a code revert, and a stored `uiSounds` key is ignored by older builds.
