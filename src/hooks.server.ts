import type { Handle } from "@sveltejs/kit";
import { clerkClient } from "$lib/services/auth/clerk.server";

export const handle: Handle = async ({ event, resolve }) => {
	const requestState = await clerkClient.authenticateRequest(event.request, {
		authorizedParties: [event.url.origin]
	});

	// A "handshake" means Clerk couldn't fully verify the session from cookies
	// alone (e.g. dev-browser sync, token refresh) and toAuth() would report
	// signed-out even for an actually-signed-in visitor. Redirect through
	// Clerk's handshake endpoint first so the *first* render already has a
	// verified session, instead of flashing signed-out for one request.
	const handshakeLocation = requestState.headers.get("location");
	if (handshakeLocation) {
		const headers = new Headers(requestState.headers);
		headers.set("access-control-expose-headers", "location");
		return new Response(null, { status: 307, headers });
	}

	event.locals.auth = requestState.toAuth();

	const response = await resolve(event);

	requestState.headers.forEach((value, key) => response.headers.append(key, value));

	return response;
};
