import { redirect } from "@sveltejs/kit";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { api } from "../../../convex/_generated/api.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.auth;
	if (!auth?.userId) return {};

	let room: FunctionReturnType<typeof api.models.rooms.index.active>;
	try {
		const token = await auth.getToken();
		if (!token) return {};
		const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		convex.setAuth(token);
		room = await convex.query(api.models.rooms.index.active, {});
	} catch (err) {
		// Fail open: the page's own `rooms.active` subscription still redirects if the room shows up.
		console.error("Failed to check for an active room on /play", err);
		return {};
	}
	if (room) redirect(307, `/${room.type}/${room.code}`);
	return {};
};
