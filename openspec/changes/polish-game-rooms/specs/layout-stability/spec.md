# Spec Delta

## MODIFIED Requirements

### Requirement: Placeholders match their content's box

Wherever this change shows a loading placeholder (a Skeleton or a Spinner state) in place of content, the placeholder SHALL occupy the same box as the content that replaces it, so swapping one for the other does not move surrounding elements. Content shown conditionally on a query (such as the active-room card) SHALL appear in the same swap as the rest of the page's content, not after it.

#### Scenario: Lobby list replaces its skeleton in place

- **WHEN** a signed-in user loads `/lobby` and the open-rooms query resolves
- **THEN** the page header and footer record no layout-shift entry

#### Scenario: Game room replaces its placeholder in place

- **WHEN** a seated player loads `/checkers/ABCD` and the room query resolves
- **THEN** the room bar, both player strips, the board, and the round controls appear in the box the placeholder occupied, and no layout-shift entry is recorded

#### Scenario: Room placeholder mirrors the strips

- **WHEN** the room placeholder renders below the `lg` breakpoint
- **THEN** it has a room-bar slot, then a strip-height slot above and below a square area at the board's size, followed by the round controls row and the notice line, with no emoji columns beside the board

#### Scenario: Room placeholder mirrors the side panel

- **WHEN** the room placeholder renders at 1280x800
- **THEN** it reserves the side panel's box beside the board column, no room-bar slot, and no controls slot, and loading the room records no layout-shift entry

## ADDED Requirements

### Requirement: Room overlays do not shift layout

The result card, the invite card, and the rules popover SHALL overlay the board area or float above the page, and SHALL appear and disappear with `transform` or `opacity` only, held still when reduced motion is requested.

#### Scenario: Round ends with the card

- **WHEN** two seated players finish a round at 360x640 and at 1280x800 while the layout-shift observer runs
- **THEN** the result card appears and no layout-shift entry is recorded

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is emulated and a round ends
- **THEN** the result card appears without a running animation
