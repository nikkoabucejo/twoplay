import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const GET: RequestHandler = ({ url }) => {
	redirect(308, url.pathname.replace(/^\/how-to-play/, "/learn") + url.search);
};
