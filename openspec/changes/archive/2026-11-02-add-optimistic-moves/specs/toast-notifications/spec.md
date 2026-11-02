# Spec Delta

## ADDED Requirements

### Requirement: Rejected-move toast

When the server rejects the viewer's pending move, the room SHALL show one error toast reading "Move not accepted". Each rejected move SHALL show its own toast; moves rolled back with it SHALL NOT add more.

#### Scenario: One toast per rejection

- **WHEN** two checkers jumps are pending and the first one's play request rejects
- **THEN** exactly one error toast reading "Move not accepted" is shown, inside the polite live region

#### Scenario: Two separate rejections

- **WHEN** a pending move is rejected, the viewer moves again, and that move is also rejected
- **THEN** two "Move not accepted" toasts have been shown
