import { ConvexHttpClient } from "convex/browser";
import { clerkClient } from "$lib/services/auth/clerk.server";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { api } from "../../convex/_generated/api.js";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	const auth = locals.auth;
	if (!auth?.userId) return { user: null };

	const user = await clerkClient.users.getUser(auth.userId);
	const email = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ?? null;
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email || "Anonymous";

	// No named JWT template needed — Convex reads the `aud: "convex"` claim
	// mapped onto the default session token (Clerk dashboard → Sessions →
	// Customize session token → Claims, or "Activate Convex integration").
	const token = await auth.getToken();
	if (token) {
		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);
		await convex.mutation(api.users.store, { name });
	}

	return {
		user: { id: user.id, email, name, imageUrl: user.hasImage ? user.imageUrl : null },
	};
};
