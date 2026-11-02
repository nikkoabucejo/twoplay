# board-squares Specification

## Purpose

Defines the square styling shared by the chess and checkers boards, live and Learn, so both games render the same board.

## Requirements

### Requirement: Shared square styling

The chess and checkers boards, live and Learn, SHALL render squares with the same classes: light squares `bg-background`, dark squares `bg-foreground/15`, no hover background, the same focus-visible ring on interactive squares, the same selected-ring classes, and the same move-target dot. The last-move tint SHALL override the base color, and the chess check mark SHALL override the tint.

#### Scenario: Marks win over the base color

- **WHEN** a dark square is the last-move square and also holds the king in check
- **THEN** its class list contains `bg-destructive/20` and neither `bg-foreground/15` nor the tint background

#### Scenario: No hover background

- **WHEN** an interactive square is rendered on any chess or checkers board
- **THEN** its class list contains no `hover:bg-*` class

#### Scenario: Live and Learn boards match

- **WHEN** the live board and the Learn board render the same square state for the same game
- **THEN** the square, selected-ring, and move-dot class lists are equal
