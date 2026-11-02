# Spec Delta

## Purpose

Defines the quick-match queue on the server: who can be paired, when a waiting entry is removed, and how an entry that waited too long is reported back to its owner.

## ADDED Requirements

### Requirement: Entering a room leaves the queue

When a user creates a room, joins a room, or is matched, the server SHALL remove that user's queue entry in the same mutation.

#### Scenario: Creating a room while queued

- **WHEN** a queued user creates a room
- **THEN** that user has no queue entry and `pairings.status` returns false for them

#### Scenario: Joining a room while queued

- **WHEN** a queued user joins another user's room
- **THEN** that user has no queue entry

### Requirement: Only free users are paired

`pairings.enqueue` SHALL pair the caller only with a waiting, unexpired entry whose user exists and has no active room. Each entry it passes over for having a missing user or an active room SHALL be deleted, and the search SHALL continue with the next entry. With no valid entry left, the caller SHALL be queued.

#### Scenario: A waiting user who has since entered a room

- **WHEN** user A is queued for tic-tac-toe and has an active room, and user B enqueues for tic-tac-toe
- **THEN** B is queued and not matched, A's queue entry is deleted, and A still has exactly one active room

#### Scenario: A stale entry ahead of a valid one

- **WHEN** the oldest tic-tac-toe entry belongs to a user with an active room, the next belongs to a free user C, and user B enqueues for tic-tac-toe
- **THEN** B and C are matched into one new room and the stale entry is deleted

### Requirement: An entry that waits too long expires

The sweep SHALL mark an entry older than the queue timeout as expired instead of deleting it. An expired entry SHALL never be matched, and `pairings.status` SHALL return false for its owner. The server SHALL delete it when its owner enqueues, cancels, creates, or joins, or when the sweep finds it expired for longer than the retention period.

#### Scenario: The sweep expires a waiting entry

- **WHEN** a user's entry is older than the queue timeout and the sweep runs
- **THEN** `pairings.status` returns false and `pairings.expired` returns true for that user

#### Scenario: Enqueueing again after expiry

- **WHEN** a user whose entry expired enqueues again with nobody else waiting
- **THEN** they have one unexpired entry and `pairings.expired` returns false

### Requirement: The owner can read whether their search expired

`pairings.expired` SHALL require a signed-in user and SHALL return true only when the caller's own queue entry is expired.

#### Scenario: A signed-out caller

- **WHEN** a caller with no identity reads `pairings.expired`
- **THEN** it throws "Sign in to play"

#### Scenario: Another user's entry expired

- **WHEN** user A's entry is expired and user B, who is not queued, reads `pairings.expired`
- **THEN** it returns false
