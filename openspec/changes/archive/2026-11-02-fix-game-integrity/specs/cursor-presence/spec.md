# Spec Delta

## Purpose

Defines when a game room's client shares the viewer's live cursor with other players, so spectators and departed players send no cursor traffic.

## ADDED Requirements

### Requirement: Only a seated viewer sends cursor updates

The client SHALL send cursor position updates only while the viewer holds a seat in the room and the room is active.

#### Scenario: A spectator moves the pointer

- **WHEN** the room data shows the viewer has no seat and the pointer moves over the board
- **THEN** no cursor update is sent

#### Scenario: A seated player moves the pointer

- **WHEN** the room data shows the viewer in seat 0 of an active room and the pointer moves over the board
- **THEN** one cursor update is sent with the normalized position

#### Scenario: The room has closed

- **WHEN** the room data shows the viewer seated but the room closed, and the pointer moves
- **THEN** no cursor update is sent

### Requirement: Only a sent cursor is cleared

The client SHALL request clearing the viewer's cursor on pointer leave or teardown only if it has sent a cursor update since the last clear.

#### Scenario: A spectator leaves the board

- **WHEN** a spectator's pointer leaves the board and the component tears down
- **THEN** no cursor clear is sent

#### Scenario: A seated player leaves the board

- **WHEN** a seated player who sent a cursor update moves the pointer off the board
- **THEN** one cursor clear is sent
