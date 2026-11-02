import { error } from "@sveltejs/kit";
import { GAMES } from "$lib/features/play";
import type { GameType } from "../../../../convex/models/games/index.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
	if (!Object.hasOwn(GAMES, params.game)) error(404, "Not found");
	return { game: params.game as GameType };
};
