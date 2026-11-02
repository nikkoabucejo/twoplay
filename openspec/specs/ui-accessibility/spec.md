# ui-accessibility Specification

## Purpose

Sets the accessibility contract for shared controls: loading indicators, segmented tab choices, keyboard focus visibility, and reduced motion.

## Requirements

### Requirement: Spinner announces loading

A spinner SHALL expose `role="status"` and an accessible label, defaulting to "Loading" and overridable by the caller.

#### Scenario: Default label

- **WHEN** a spinner renders without a label
- **THEN** it is found by role `status` with accessible name "Loading"

#### Scenario: Custom label

- **WHEN** a spinner renders with label "Finding opponent"
- **THEN** its accessible name is "Finding opponent"

### Requirement: Tabs act as a single-choice group

Tabs SHALL be exposed as a `radiogroup` of `radio` options with `aria-checked` on the selected one. Only the selected option SHALL be in the tab order.

#### Scenario: Roles and checked state

- **WHEN** tabs render with the second item selected
- **THEN** the container has role `radiogroup`, each option has role `radio`, the second has `aria-checked="true"`, and only it has `tabindex="0"`

### Requirement: Tabs keyboard navigation

While an option has focus, ArrowRight and ArrowDown SHALL select and focus the next option, ArrowLeft and ArrowUp the previous, wrapping at the ends; Home and End SHALL select the first and last. Disabled tabs SHALL ignore these keys.

#### Scenario: Arrow wraps to first

- **WHEN** the last option has focus and the user presses ArrowRight
- **THEN** the first option becomes selected and focused, and the change callback fires with its value

#### Scenario: Disabled tabs ignore keys

- **WHEN** the tabs are disabled and the user presses ArrowRight
- **THEN** the selection does not change and the change callback is not called

### Requirement: Focus ring contrast

Keyboard focus rings on interactive controls SHALL have at least 3:1 contrast against the dark background.

#### Scenario: Rendered ring contrast

- **WHEN** a header link, a tab option, and a button are focused from the keyboard and their computed ring color (including its opacity) is composited over the page background
- **THEN** each contrast ratio is at least 3:1

### Requirement: Reduced motion

When the user requests reduced motion, the landing wordmark glow, the mood blobs, the tic-tac-toe icon's wobble, the checkers icon's bouncing pieces, the chess icon's motion, the board shake, and the About pipeline token, run log replay, and hero board SHALL stop animating, keeping their static appearance. The About build SHALL NOT start on its own under the OS or app setting and SHALL run only on Replay, without follow-scroll.

#### Scenario: Wordmark and blobs hold still

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/` is loaded
- **THEN** the wordmark and mood blobs have no running animation and are still visible

#### Scenario: Tic-tac-toe icon holds still

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/play` shows the tic-tac-toe icon
- **THEN** the icon's X has no running animation and is still visible

#### Scenario: Checkers icon holds still

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/play` shows the checkers icon
- **THEN** the icon renders its pieces in their resting positions with no `<animate>` element and no running animation

#### Scenario: Chess icon holds still

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/play` shows the chess icon
- **THEN** the icon renders in its resting position with no `<animate>` element and no running animation

#### Scenario: No shake on a rejected move

- **WHEN** reduced motion is requested and the server rejects the viewer's pending move
- **THEN** the board starts no animation, and the "Move not accepted" toast is still shown

#### Scenario: Shake without reduced motion

- **WHEN** reduced motion is not requested and the server rejects the viewer's pending move
- **THEN** the board runs one shake animation that changes only `transform`

#### Scenario: About build does not auto-play

- **WHEN** `prefers-reduced-motion: reduce` is emulated and a visitor opens `/about` for the first time in the session
- **THEN** no build starts, the final page is visible, and the HUD shows Replay

#### Scenario: Always reduce stops the About build

- **WHEN** the system allows motion, reduced motion is set to always, and a visitor opens `/about` for the first time in the session
- **THEN** no build starts, the final page is visible, and the HUD shows Replay

#### Scenario: About ambient motion holds still

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/about` shows its final page
- **THEN** the pipeline token, the run log, and the hero board have no running animation and are still visible
