// Client-safe barrel only. `clerkClient` (holds CLERK_SECRET_KEY) lives under `./server` instead —
// SvelteKit forbids importing `$env/static/private` from code reachable by the client bundle, so it
// can't be re-exported here. Server-only callers (hooks.server.ts, +layout.server.ts, app.d.ts)
// import `$lib/services/auth/server` directly.
export { ClerkAuth, setupClerkAuth, getClerkAuth, type ClerkProfile } from "./client/index.js";
