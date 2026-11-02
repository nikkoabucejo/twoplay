# toast-notifications Specification

## Purpose

Provides brief, non-blocking confirmation messages that assistive technology announces, starting with confirming a copied invite link.

## Requirements

### Requirement: Show and auto-dismiss a toast

The app SHALL show a toast with a message on request and remove it after its duration (default 3 seconds). A toast SHALL be dismissible before then.

#### Scenario: Toast expires

- **WHEN** a toast is shown with the default duration and 3 seconds pass
- **THEN** it is no longer displayed

#### Scenario: Manual dismiss

- **WHEN** a toast is dismissed by id before it expires
- **THEN** it is removed immediately and other toasts remain

### Requirement: Bounded toast stack

At most three toasts SHALL be visible; showing a fourth SHALL remove the oldest.

#### Scenario: Oldest drops

- **WHEN** four toasts are shown in a row
- **THEN** the three most recent are displayed and the first is gone

### Requirement: Toasts are announced

Toasts SHALL render inside a single polite live region so screen readers announce them without moving focus.

#### Scenario: Live region

- **WHEN** a toast is shown
- **THEN** its message appears inside an element with `aria-live="polite"` and focus stays where it was

### Requirement: Copy-link confirmation

Copying a room's invite link SHALL show a toast confirming the link was copied. If the clipboard write fails, an error toast SHALL say the link could not be copied.

#### Scenario: Link copied

- **WHEN** a host creates a room and activates Copy link
- **THEN** the invite URL is on the clipboard and a "Link copied" toast appears

#### Scenario: Clipboard denied

- **WHEN** the clipboard write rejects
- **THEN** an error toast says the link could not be copied

### Requirement: Rejected-move toast

When the server rejects the viewer's pending move, the room SHALL show one error toast reading "Move not accepted". Each rejected move SHALL show its own toast; moves rolled back with it SHALL NOT add more.

#### Scenario: One toast per rejection

- **WHEN** two checkers jumps are pending and the first one's play request rejects
- **THEN** exactly one error toast reading "Move not accepted" is shown, inside the polite live region

#### Scenario: Two separate rejections

- **WHEN** a pending move is rejected, the viewer moves again, and that move is also rejected
- **THEN** two "Move not accepted" toasts have been shown
