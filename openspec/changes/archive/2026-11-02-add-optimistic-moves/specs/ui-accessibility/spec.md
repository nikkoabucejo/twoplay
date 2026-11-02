# Spec Delta

## MODIFIED Requirements

### Requirement: Reduced motion

When the user requests reduced motion, the landing wordmark glow animation, the ambient mood blobs, the tic-tac-toe game icon's wobble, the checkers game icon's bouncing pieces, and the rejected-move board shake SHALL stop animating, while their static appearance remains.

#### Scenario: Wordmark and blobs hold still

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/` is loaded
- **THEN** the wordmark and mood blobs have no running animation and are still visible

#### Scenario: Tic-tac-toe icon holds still

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/play` shows the tic-tac-toe icon
- **THEN** the icon's X has no running animation and is still visible

#### Scenario: Checkers icon holds still

- **WHEN** `prefers-reduced-motion: reduce` is emulated and `/play` shows the checkers icon
- **THEN** the icon renders its pieces in their resting positions with no `<animate>` element and no running animation

#### Scenario: No shake on a rejected move

- **WHEN** reduced motion is requested and the server rejects the viewer's pending move
- **THEN** the board starts no animation, and the "Move not accepted" toast is still shown

#### Scenario: Shake without reduced motion

- **WHEN** reduced motion is not requested and the server rejects the viewer's pending move
- **THEN** the board runs one shake animation that changes only `transform`
