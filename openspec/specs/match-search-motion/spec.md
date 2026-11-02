# match-search-motion Specification

## Purpose

Defines how the play page and the ambient background move while a quick-match search is running, so searching feels active without shifting layout or ignoring reduced motion.

## Requirements

### Requirement: The queue card moves while searching

While the player is queued for a quick match, the queue card SHALL show continuous seat-colored motion: a ring travelling around the card and an animated radar around the elapsed timer. The motion SHALL stop when the queue view closes.

#### Scenario: Searching shows motion

- **WHEN** the player clicks "Find match" and is queued
- **THEN** the card shows a moving seat-colored ring and the timer shows a radar with both seat colors in motion

#### Scenario: Leaving the queue stops the motion

- **WHEN** the player cancels, chooses "Play a friend instead", or is matched
- **THEN** the ring and radar are no longer shown

### Requirement: The background enters a searching mood

While the player is queued, the ambient background SHALL switch to a searching state: the clouds play about three times faster without jumping, and the seats take turns swelling: one seat's clouds grow while the other's shrink, swapping every beat. When the queue view closes, the background SHALL return to the state it had before.

#### Scenario: Background speeds up while queued

- **WHEN** the player is queued
- **THEN** the clouds use the searching rate, seat 0's clouds swell while seat 1's shrink, and the two swap on each beat

#### Scenario: Background settles after the search

- **WHEN** the queue view closes or the play page unmounts
- **THEN** the background leaves the searching state

### Requirement: Search motion respects reduced motion

Under the OS reduced-motion setting or the in-app "Always reduce" preference, the queue view SHALL show a still seat-tinted ring and radar with no travelling or orbiting motion, the seats do not swap, and the background SHALL neither drift nor ease between sizes.

#### Scenario: Reduced motion shows a still treatment

- **WHEN** reduced motion is on and the player is queued
- **THEN** the ring and the two seat dots are visible but static, the ripples are hidden, and no element animates

### Requirement: Search motion never shifts layout

Showing, animating, or hiding the search motion SHALL not move or resize any element on the play page; it SHALL be drawn only as overlays inside the card's existing box.

#### Scenario: No layout shift from setup to queued to cancel

- **WHEN** the player goes from setup to queued and back to setup at 390px and 1280px
- **THEN** the layout-shift script records zero entries

### Requirement: Search status stays quiet for screen readers

The searching status SHALL be announced once through the existing polite live region; decorative motion SHALL be hidden from assistive technology.

#### Scenario: Motion is decorative

- **WHEN** the player is queued
- **THEN** the ring and radar elements are aria-hidden and the live region text is unchanged
