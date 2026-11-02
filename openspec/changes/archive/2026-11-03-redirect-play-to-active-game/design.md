## Context

/play has no load function. play.svelte subscribes to `rooms.active` on the client, renders the `checking` skeleton while it loads, then the Playing card for a filled room or the waiting view for a one-seat room. `src/routes/+layout.server.ts` already calls Convex from the server with `locals.auth.getToken()` and `ConvexHttpClient.setAuth`.

## Goals / Non-Goals

**Goals:** a visitor with an active room never sees /play; they land on the game route and see its own skeleton.

**Non-Goals:** queue handling, game page loading, /lobby and /history, Convex changes.

## Decisions

- **Server load, not a client redirect.** `+page.server.ts` runs before /play renders, on SSR and on client navigation (`__data.json`), so neither the /play skeleton nor its card mounts. A client-only redirect would still flash the skeleton.
- **307 to `/<type>/<code>`.** A temporary redirect, the bare live-round route. `?game=` is ignored once a room exists.
- **Fail open.** The load wraps the token and query in try/catch and returns `{}` on error, like the root layout. The client fallback in `playView` then redirects if the room shows up client-side. `redirect()` is thrown outside the try so it is not swallowed.
- **No `await parent()`.** The page load runs in parallel with the root layout's `users.store`. A first-ever visit whose user row is not stored yet makes `requireUser` throw, which fails open to the page and the client fallback. Awaiting the parent would add latency to every /play load.
- **`playView`:** an active room this page did not start returns `{ kind: "checking", redirect: "/<type>/<code>" }` at any seat count, so it doesn't wait on `rooms.get`. A room this page started keeps today's rules (pending, waiting, then redirect). The `playing` kind and the Playing import go.

## Trust boundary

The server load is authenticated by Clerk (`hooks.server.ts` sets `locals.auth`). The session token goes to Convex. `rooms.active` runs `requireUser(ctx)` and derives the room from that user via `getActiveRoomForUser`. No client input reaches the query. The redirect only reveals the visitor's own room.

## Risks / Trade-offs

- One extra Convex round trip per /play load and per hover preload. It's acceptable: it's a single indexed read.
- Clerk `getToken()` is called again (it is also called in the root layout). Cost is small.

## Impact on callers

- `playView` callers: only play.svelte. Updated.
- `rooms.active` consumers (`+layout.svelte`, lobby, history, cursor) are unaffected because the query is unchanged.
- `Playing` is unaffected because /lobby and /history still use it.
