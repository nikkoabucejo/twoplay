# Design

## Context

`play.svelte` holds all /play state: the carousel (`ENTRIES`, `iconOffsetRem`), `mode` (`matchmaking | public | private`), `timeControlMinutes`, `createdCode`, `creating`/`queuing`, and the queries `rooms.active`, `rooms.get` (for the created room), and `pairings.status`. `activeRoomRedirect` in `active-room.ts` sends any active room straight to its URL unless `createdCode` or `isCreating` is set. `copyLink` in `copy-link.ts` already toasts. `src/routes/play/+page.svelte` wraps `<Play>` in `<Page title="Play" titleClass="sr-only">`. `PreferencesStore.setSound` writes `{ sound }` only, so any new field would be wiped by a sound change.

## Goals / Non-Goals

**Goals:** one view state derived from the queries, so redirect rules are a pure, tested function. Keep the trust boundary as it is.

**Non-Goals:** server-side queue cleanup or a server queue timestamp (change E), a shared dialog component.

## Decisions

### 1. One derived view instead of redirect-only logic

`active-room.ts` replaces `activeRoomRedirect` with `playView(input)`. It returns one of `checking | setup | pending | waiting | queued | playing` plus an optional `redirect` path. Inputs: the `rooms.active` result, the seat count from `rooms.get` for that code, `pairings.status`, whether this page started a queue or a room (`startedHere`), and the in-flight flags. Rules:

- If `rooms.active` is still loading, the view is `checking`.
- If the active room has one seat, the view is `waiting`. This covers a reload during the wait.
- If the active room has two seats and `startedHere`, the result is a redirect. Otherwise the view is `playing`.
- If the queue status is true, the view is `queued`.

Alternative: keep `activeRoomRedirect` and add flags in the component. Rejected. The rules would be spread across `$effect`s with no test. Svelte 5 needs `$derived` for computable state, and a pure function is testable without rendering.

`createdCode` goes away. The waiting room reads its code from `rooms.active`, which Convex updates before `create` resolves. The existing Convex comment in `active-room.ts` still applies: `isCreating` keeps the view at `pending` until the code is known.

### 2. Play owns the Page

The game cards and the sidebar share state, and `Page` takes `sidebar` as a snippet. `play.svelte` renders `<Page title="Play" titleClass="sr-only">` with a `sidebar` snippet. `+page.svelte` keeps `Meta` and the `?game=` parse. Alternative: hoist the state into a `.svelte.ts` class created in the route. Rejected because that is more code for one consumer.

### 3. Game cards are a play-local radiogroup

`game-cards.svelte` in `features/core/play` uses the same roving `tabindex` and key map as `Tabs`, but each card shows an `Emblem` and the name. Alternative: extend `Tabs` with a render snippet. Rejected because `Tabs` is a compact segmented control used elsewhere, and cards need a different box.

### 4. Queue cancel on leave

An `$effect` registers a `pagehide` listener while the view is `queued`. Its cleanup, which runs on teardown or when the view leaves `queued`, calls `pairings.cancel` only if the view was still `queued` at teardown, so a match does not trigger a stray cancel. This is best effort: a websocket mutation fired during `pagehide` may not reach the server. Change E's server sweep is the backstop.

### 5. Elapsed timer

`formatElapsed(ms)` in `elapsed.ts` returns `mm:ss`. The component stores `queuedAt = Date.now()` when the view enters `queued` and ticks once a second. The text uses `tabular-nums` with a fixed width so it never reflows.

### 6. Share

`shareLink(url, { share, toaster })` in `copy-link.ts` calls `navigator.share({ url })`. An `AbortError` (the user closed the sheet) is silent, and any other error shows the existing error toast. The button renders only when `typeof navigator.share === "function"`, checked after mount, so SSR markup is the same. Its slot is reserved, so the row doesn't shift.

### 7. Active game uses `Playing` as it is

For the `playing` view, /play renders the shared `Playing` card (`components/ui/playing`) with no edits. Change C (polish-core-pages) owns that file and adds the Resume label and the Abandon confirmation, so /play gets both once C lands. Alternative: a card local to /play. Rejected because it duplicates `Playing`.

### 8. Preferences: one `lastPlay` field, full-object writes

`Preferences` gains `lastPlay: { game: GameType; opponent: "anyone" | "friend" | "open"; minutes: 3 | 5 | 10 } | null`, and `parsePreferences` validates it. Writes go through one private `#write()` that serializes every field. `setSound` and the new `setLastPlay` both call it. This is the first prefs change. It appends `lastPlay` to the type, the defaults, and the parse, adds `#write()` and `setLastPlay` after `setSound`, and changes the single body line of `setSound`. Change D then appends its settings fields to the type, the defaults, the parse, and `#write()`.

Alternative: a separate storage key for the play setup. That is fully conflict-free, but it splits preferences across keys and goes against the request to keep them in the prefs module's store.

### Trust boundary

No Convex code changes. Every call already authenticates: `rooms.create`, `pairings.enqueue`, `pairings.cancel`, and `pairings.status` via `requireUser`, and `rooms.abandon` via `requirePlayer` for that room's seat. `rooms.active` returns only the caller's own room. The client's `playView` is display-only, and the server still rejects a second room (`create` and `enqueue` return the existing active room).

## Risks / Trade-offs

- `pagehide` cancel may not arrive → server sweep (change E). The queue entry otherwise stays until it is matched or swept.
- Timer restarts on reload → acceptable; `pairings.status` has no timestamp, and adding one is a Convex change.
- Change D builds on `preferences.svelte.ts` → this change lands first with `#write()`, and D appends its fields to it.
- Until change C lands, Abandon on /play's `Playing` card has no confirmation → accepted. C adds it in the shared card.
