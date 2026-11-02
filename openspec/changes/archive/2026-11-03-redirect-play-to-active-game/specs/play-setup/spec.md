## ADDED Requirements

### Requirement: Active game redirect

When a signed-in visitor requests /play, by direct load or client navigation, the server SHALL look up their active room with their session and SHALL redirect to `/<type>/<code>` when one exists, filled or waiting. A signed-out visitor, or a failed lookup, SHALL get the normal /play page.

#### Scenario: Active room redirects on the server

- **WHEN** a signed-in visitor whose active room is chess room `ABCD` requests /play
- **THEN** the server responds with a 307 redirect to `/chess/ABCD`

#### Scenario: Waiting room redirects on the server

- **WHEN** a signed-in visitor whose active room has only their seat requests /play
- **THEN** the server redirects to that room's route

#### Scenario: No active room renders the page

- **WHEN** a signed-in visitor with no active room requests /play
- **THEN** the server load returns without redirecting

#### Scenario: Signed out renders the page

- **WHEN** a signed-out visitor requests /play
- **THEN** the server load returns without calling Convex or redirecting

#### Scenario: Lookup failure renders the page

- **WHEN** the token or the `rooms.active` call throws
- **THEN** the server load returns without redirecting

### Requirement: Active game client fallback

If /play renders and then finds an active room it did not queue or create, it SHALL show the loading skeleton and navigate to that room, never the Playing card. When this page's queue entry or created room produces a filled room, the page SHALL navigate to it.

#### Scenario: Client fallback navigates to the room

- **WHEN** /play renders and `rooms.active` returns a room this page did not start
- **THEN** the loading skeleton shows, no Playing card renders, and the page navigates to the room

#### Scenario: Match found redirects

- **WHEN** the viewer was queued on this page and an active room appears
- **THEN** the page navigates to that room

## MODIFIED Requirements

### Requirement: Waiting room

After a room is created on /play, the page SHALL show "Waiting for your opponent…" with the room code, Copy link, Cancel room, and Share where `navigator.share` exists. It SHALL stay until the second seat fills, then open the room. Cancel room SHALL abandon the room and return to setup.

#### Scenario: Share hidden without Web Share

- **WHEN** the waiting room shows and `navigator.share` is undefined
- **THEN** there is no Share button and Copy link is shown

#### Scenario: Cancel room

- **WHEN** the user presses Cancel room
- **THEN** the room is abandoned and the setup controls return

#### Scenario: Opponent joins

- **WHEN** the waiting room's second seat fills
- **THEN** the page navigates to the room

### Requirement: Single card layout

/play SHALL show its controls in one centered card at every width. The waiting and queued views SHALL take the same area as the setup controls, centered in it, and the game and setup choices SHALL be hidden while they show. Switching between setup, pending, waiting, and queued views SHALL NOT change the card's height and SHALL record no layout-shift entries.

#### Scenario: Game choices hidden while queued

- **WHEN** the queue view shows
- **THEN** the game choices and the rest of the setup are hidden

#### Scenario: Queue view does not shift

- **WHEN** the user starts and cancels matchmaking
- **THEN** the card keeps its height and the layout-shift script records no entries

## REMOVED Requirements

### Requirement: Active game card

**Reason**: An active room on /play now redirects to the room instead of showing the Playing card.
**Migration**: Covered by "Active game redirect". The Playing card stays on /lobby and /history, and Abandon stays in the game page's round actions.
