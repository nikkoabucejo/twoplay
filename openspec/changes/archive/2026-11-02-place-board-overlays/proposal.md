# Proposal

## Why

Two floating elements cover the board while playing: the "Move N of M" pill sits on the top of the board while scrubbing history, and the trash-talk emoji picker opens upward over the board's bottom rows.

## What Changes

- The "Move N of M" readout leaves the board and sits with the replay buttons, in both the round controls row and the side panel.
- The trash-talk picker opens downward from the board's bottom edge, over the viewer's own strip (there is not enough room below the strip), and never flips onto the board; it gets a proper layout: a short heading and a grid of the emoji options.
- Out of scope: replay behavior, the emoji list, the trash-talk mutation, result and invite cards.

## Capabilities

### New Capabilities

- `board-overlays`: where transient room UI (the history readout and the trash-talk picker) is placed relative to the board.

### Modified Capabilities

## Impact

- `src/lib/components/layout/board/board.svelte` (the history pill and the `emojiPicker` snippet), `controls.svelte`, possibly `side-panel.svelte`, and their tests.
- These files carry uncommitted polish-game-rooms work.
- No Convex, schema, auth, or trust-boundary change.
