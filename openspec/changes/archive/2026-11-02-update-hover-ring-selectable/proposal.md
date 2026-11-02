# Proposal

## Why

The comet ring shows on hover over any card or button, so it no longer signals "this can become selected". On items that can be selected, the hover preview is a still, faint ring, which reads as broken rather than as a preview.

## What Changes

- `hover-ring` runs the comet spark on hover, in muted (neutral) colors. Selecting the item switches to `selected-ring`, which shows the same spark in seat colors.
- `hover-ring` stays only on items that become selected: tab options, play choices, lesson steps, legal contents, sound-lab scene toggles.
- Plain links and buttons drop `hover-ring` and keep their normal hover background and border: home game cards, the about GitHub link, rules doors, trash-talk emoji buttons, sound-lab pads.
- Reduced motion: the hover ring is a still muted border.

Out of scope: `selected-ring` and `search-ring` visuals, any Convex change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-tokens`: Adds the selection ring requirement (ADDED only).

## Impact

- `src/routes/layout.css`: `comet-ring` reads its colors from variables; `hover-ring` sets them to muted and runs on hover.
- Drop `hover-ring` in `game-card.svelte`, `about.svelte`, `door.svelte`, `board.svelte`, `sound-lab.svelte` (`PAD_CLASS`).
- Unaffected: `tabs.svelte`, `choices.svelte`, `lesson.svelte`, `legal.svelte`, the sound-lab scene toggles (they keep `hover-ring`); `result-card.svelte`, `play.svelte` (selected and search rings only).
