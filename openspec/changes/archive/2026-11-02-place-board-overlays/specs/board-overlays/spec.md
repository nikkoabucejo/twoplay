# Spec Delta

## Purpose

Keeps the board fully visible during play by placing the move-history readout and the trash-talk picker outside the board's area.

## ADDED Requirements

### Requirement: History readout sits with the replay controls

While the viewer looks at an earlier position, the room SHALL show "Move N of M" next to the replay buttons, outside the board's area, and SHALL show nothing over the board. Showing or hiding the readout SHALL not move or resize any element.

#### Scenario: Stepping back shows the readout by the controls

- **WHEN** five moves have been played and the viewer clicks "Previous move"
- **THEN** "Move 4 of 5" appears next to the replay buttons and no element overlaps the board

#### Scenario: Returning live hides the readout without shift

- **WHEN** the viewer clicks "Live"
- **THEN** the readout is no longer shown and no element on the page moved

### Requirement: Trash-talk picker never covers the board

The viewer's trash-talk picker SHALL open from the board's bottom edge downward, over the viewer's own strip, at the board's width, and SHALL not overlap the board or flip onto it at any viewport width.

#### Scenario: Picker opens away from the board

- **WHEN** the viewer opens the picker from their emoji box at 390px and at 1280px
- **THEN** the picker's box does not intersect the board's box

### Requirement: Trash-talk picker layout

The picker SHALL show a short "Trash talk" label that names the group of emoji options, and the emoji options as a grid of equal buttons, each with its accessible label, and selecting one SHALL close the picker.

#### Scenario: Choosing an emoji

- **WHEN** the viewer opens the picker and chooses an emoji
- **THEN** the picker closes and the emoji is sent as trash talk
