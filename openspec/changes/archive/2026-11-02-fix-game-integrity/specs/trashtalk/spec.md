# Spec Delta

## Purpose

Defines which status-strip emoji a player can set in a room and when the server accepts the change, so an opponent's client only ever renders a known emoji.

## ADDED Requirements

### Requirement: Only allowed emoji are accepted

`players.trashtalk` SHALL accept only codepoints from the server's allowed emoji list (the default emoji and the trash-talk picker's options) and SHALL throw "Unknown emoji" for any other value without writing.

#### Scenario: An allowed emoji

- **WHEN** a seated player in an active room sets emoji "1f525"
- **THEN** their player row's emoji is "1f525"

#### Scenario: An arbitrary string

- **WHEN** a seated player sets emoji "../../evil"
- **THEN** it throws "Unknown emoji" and their emoji is unchanged

### Requirement: Only active players can trash-talk

`players.trashtalk` SHALL require the caller to be seated in the room, not to have left it, and the room to be active. Otherwise it SHALL throw without writing.

#### Scenario: A spectator

- **WHEN** a signed-in user with no seat in the room sets an emoji
- **THEN** it throws "You are not a player in this room"

#### Scenario: A closed room

- **WHEN** a player whose room has closed sets an emoji
- **THEN** it throws "This room is no longer active" and their emoji is unchanged
