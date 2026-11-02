# playing-card Specification

## Purpose

Defines the Playing card that shows the viewer's live room on Lobby and History, and how leaving that room is confirmed.

## Requirements

### Requirement: Abandon asks for confirmation

Pressing Abandon on the Playing card SHALL open a confirmation instead of abandoning right away. The room SHALL be abandoned only when the viewer confirms. Cancelling or pressing Escape SHALL close the confirmation, leave the room as it was, and return focus to Abandon.

#### Scenario: Cancel keeps the room

- **WHEN** the viewer presses Abandon and then Cancel
- **THEN** the abandon mutation is not called and the Playing card is still shown

#### Scenario: Confirm abandons

- **WHEN** the viewer presses Abandon and then confirms
- **THEN** the abandon mutation is called once with the room's code

#### Scenario: Server error still shown

- **WHEN** the viewer confirms and the server rejects the abandon
- **THEN** the card shows the server's message

### Requirement: Confirmation names the cost

The confirmation SHALL state what abandoning costs, using the room's live round and the opponent's first name:

- opponent seated, round in progress: "You'll forfeit round N to X and lose 8 rating points. The room closes."
- opponent seated, round over: "The room closes."
- no opponent yet: "No one has joined yet. The room closes."

The confirm button SHALL use the destructive variant.

#### Scenario: Live round against an opponent

- **WHEN** the viewer is in round 2 against Bob Baker, the round is in progress, and they press Abandon
- **THEN** the confirmation reads "You'll forfeit round 2 to Bob and lose 8 rating points. The room closes."

#### Scenario: Waiting for an opponent

- **WHEN** the second seat is empty and the viewer presses Abandon
- **THEN** the confirmation reads "No one has joined yet. The room closes."

#### Scenario: Round already over

- **WHEN** both seats are filled, the current round has ended, and the viewer presses Abandon
- **THEN** the confirmation reads "The room closes."

### Requirement: Empty seat label

An empty seat on the Playing card SHALL be labelled "Waiting for an opponent".

#### Scenario: Empty second seat

- **WHEN** the Playing card renders a room whose second seat is empty
- **THEN** that seat's image has the accessible name "Waiting for an opponent"
