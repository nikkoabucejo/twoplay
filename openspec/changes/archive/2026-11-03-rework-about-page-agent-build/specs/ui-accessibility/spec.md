# Spec Delta

## MODIFIED Requirements

### Requirement: Reduced motion

When the user requests reduced motion, the landing wordmark glow animation, the ambient mood blobs, the tic-tac-toe game icon's wobble, the checkers game icon's bouncing pieces, the chess game icon's motion, the rejected-move board shake, and the About page's ambient animations (the pipeline token and the hero board) SHALL stop animating, while their static appearance remains. The About build SHALL NOT start on its own under the OS setting or the app's "Always reduce" setting, and its head script SHALL NOT hide the page; it SHALL run only when the user activates Replay, without follow-scroll.

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
- **THEN** the pipeline token and the hero board have no running animation and are still visible
