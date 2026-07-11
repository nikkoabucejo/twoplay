import type { Handle } from "@sveltejs/kit";
import { clerkClient } from "$lib/services/auth/clerk.server";

export const handle: Handle = async ({ event, resolve }) => {
	const requestState = await clerkClient.authenticateRequest(event.request, {
		authorizedParties: [event.url.origin]
	});

	event.locals.auth = requestState.toAuth();

	const response = await resolve(event);

	requestState.headers.forEach((value, key) => response.headers.append(key, value));

	return response;
};
