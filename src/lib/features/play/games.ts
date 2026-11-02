import type { Component } from "svelte";
import { CheckersIcon, TictactoeIcon } from "$lib/assets/icons/games";
import { SEAT_COLORS } from "$lib/utils/style";
import type { GameType } from "../../../../convex/models/games/index.js";

export type GameAccentColors = readonly [string, string];
export type GameMeta = {
	name: string;
	/** One sentence, shown on the landing page's game cards. */
	description: string;
	icon: Component<{ class?: string }>;
	colors: GameAccentColors;
};

/** Single source of truth for each game's display name/icon — used by the home page picker, the
 *  `Play` create/join form, the `Lobby` rooms browser, and `History`, so the four never drift apart. */
export const GAMES: Record<GameType, GameMeta> = {
	tictactoe: {
		name: "Tic-Tac-Toe",
		description: "Nine boards. Win three in a row.",
		icon: TictactoeIcon,
		colors: SEAT_COLORS
	},
	checkers: {
		name: "Checkers",
		description: "Jump and crown on an 8x8 board.",
		icon: CheckersIcon,
		colors: SEAT_COLORS
	}
};

export const GAME_TYPES = Object.keys(GAMES) as GameType[];
