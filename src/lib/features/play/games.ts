import type { Component } from "svelte";
import { CheckersIcon, TictactoeIcon } from "$lib/assets/icons/games";
import type { GameType } from "../../../../convex/models/games/index.js";

export type GameMeta = { name: string; icon: Component<{ class?: string }> };

/** Single source of truth for each game's display name/icon — used by the home page picker, the
 *  `Play` create/join form, the `Lobby` rooms browser, and `History`, so the four never drift apart. */
export const GAMES: Record<GameType, GameMeta> = {
	tictactoe: { name: "Tic-Tac-Toe", icon: TictactoeIcon },
	checkers: { name: "Checkers", icon: CheckersIcon }
};

export const GAME_TYPES = Object.keys(GAMES) as GameType[];
