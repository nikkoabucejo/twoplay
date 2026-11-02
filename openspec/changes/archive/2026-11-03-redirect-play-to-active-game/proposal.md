## Why

A signed-in player with an active room who opens /play sees the setup skeleton, then a Playing card with Resume and Abandon. They wanted their game, so /play is a detour, and its skeleton flashes before the game loads. This reverses the "no silent redirect" decision from `polish-new-game` on purpose.

## What Changes

- New `src/routes/play/+page.server.ts`: for a signed-in visitor, it asks Convex `rooms.active` with the Clerk session token and redirects (307) to `/<type>/<code>` when a room exists, whether it is waiting for an opponent or in play. A server load also runs on client navigation, so nav links are covered. Signed-out visitors and Clerk or Convex errors fall through to the normal page.
- `playView` drops the `playing` kind. An active room this page did not start returns a redirect to the room (a client fallback when the server load failed open), shown as the `checking` skeleton until navigation.
- /play no longer renders the Playing card. The card stays on /lobby and /history. Abandon stays available in the game page's round actions.
- **BREAKING (spec):** play-setup "Active game card" is replaced by "Active game redirect". "Waiting room" no longer reshows the waiting view on reload. "Single card layout" drops the active view.

Out of scope: the matchmaking queue (not a room, so the queued view stays on /play), the game page's own loading skeletons, /lobby and /history, and any Convex change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `play-setup`: an active room on load redirects to the room. The Playing card and the reload-to-waiting-view behavior are removed.

## Impact

- New server load for /play: reads the Clerk session token from `locals.auth` and calls the existing public query `rooms.active` (`requireUser` on the server). No new Convex function, no schema change. Trust boundary unchanged: the server derives the room from the authenticated user.
- One extra Convex round trip per /play server load, including hover preloads (`data-sveltekit-preload-data="hover"`).
- Files: `src/routes/play/+page.server.ts` (new) and its test, `src/lib/features/core/play/active-room.ts` and its test, `src/lib/features/core/play/play.svelte` and its test, `openspec/specs/play-setup/spec.md`.
- Overlap: `fix-client-convex-function-imports` task 3.2 edits an import in `play.svelte`. The edits don't touch the same lines.
