# board-overlays Specification

## Purpose

Keeps the board fully visible during play by placing the move-history readout and the trash-talk picker outside the board's area.

## Requirements

### Requirement: History readout sits with the replay controls

While the viewer looks at an earlier position, the room SHALL show "Move N of M" next to the replay buttons, outside the board's area, and SHALL show nothing over the board. Showing or hiding the readout SHALL not move or resize any element.

#### Scenario: Stepping back shows the readout by the controls

- **WHEN** five moves have been played and the viewer clicks "Previous move"
- **THEN** "Move 4 of 5" appears next to the replay buttons and no element overlaps the board

#### Scenario: Returning live hides the readout without shift

- **WHEN** the viewer clicks "Live"
- **THEN** the readout is no longer shown and no element on the page moved

### Requirement: Trash-talk picker never covers the board

The viewer's trash-talk picker SHALL be anchored over the viewer's own strip and sized exactly to it, and SHALL not overlap the board or flip onto it at any viewport width. Escape and a click outside SHALL close it.

#### Scenario: Picker opens away from the board

- **WHEN** the viewer opens the picker from their emoji box at 360px, 768px, and 1280px
- **THEN** the picker's box equals the viewer's strip box and does not intersect the board's box

#### Scenario: Closing the picker

- **WHEN** the picker is open and the viewer presses Escape or clicks outside it
- **THEN** the picker closes

### Requirement: Trash-talk picker layout

The picker SHALL show its ten emoji options in one row of equal buttons, each with its accessible label, in a group labelled "Trash talk" with no visible heading. Left and Right arrows SHALL move focus between the options, wrapping at the ends. Selecting one SHALL close the picker.

#### Scenario: Choosing an emoji

- **WHEN** the viewer opens the picker and chooses an emoji
- **THEN** the picker closes and the emoji is sent as trash talk

#### Scenario: One row of ten

- **WHEN** the picker opens
- **THEN** a group named "Trash talk" holds ten buttons on one row, and no "Trash talk" text is visible

#### Scenario: Arrow keys

- **WHEN** the last option has focus and the viewer presses ArrowRight
- **THEN** the first option has focus
