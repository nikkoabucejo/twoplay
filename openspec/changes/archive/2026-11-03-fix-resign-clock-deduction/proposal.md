# Proposal

## Why

When a seat resigns or abandons on its own turn, the server stops that seat's clock without deducting the time used on the turn. The settled round shows the clock at its start-of-turn value (QA: about 8:40 left, shown as 10:00).

## What Changes

- `resign`, `forfeitRoom` (used by `abandon`), and the empty-room branch of `sweep` stop clearing the caller's `turnedAt` before settling. `settleRound` then banks the elapsed time and stops every clock in one place.
- No schema, auth, or public API change.
- Out of scope: making `resign` claim an already-expired clock as a timeout.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `round-settlement`: "Clocks stop when a round settles" gains scenarios for resigning and abandoning on your own turn, and for resigning off-turn.

## Impact

- `convex/models/games/index.ts`: `resign`.
- `convex/models/rooms/index.ts`: `forfeitRoom`, `sweep`.
- Tests: `convex/models/games/index.test.ts`, `convex/models/rooms/index.test.ts`.
