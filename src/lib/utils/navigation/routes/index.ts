import type { Component } from "svelte";
import { Gamepad2, History, Trophy, Users } from "@lucide/svelte";
import type { GameType } from "../../../../../convex/models/games/index.js";

export type NavItem = {
	href: string;
	label: string;
	icon: Component<{ class?: string }>;
};

export const NAV_ITEMS: readonly NavItem[] = [
	{ href: "/play", label: "Play", icon: Gamepad2 },
	{ href: "/lobby", label: "Lobby", icon: Users },
	{ href: "/history", label: "History", icon: History },
	{ href: "/leaderboard", label: "Leaderboard", icon: Trophy }
];

export const SUPPORT_URL = "https://ko-fi.com/nikkoabucejo";

/** Matches the `[code]` segment rather than the `(games)` group, which also holds the landing page.
 *  A null id (no matching route) is not a room. */
export function isGameRoomRoute(routeId: string | null): boolean {
	return routeId?.split("/").includes("[code]") ?? false;
}

const GATED_ROUTE_IDS = new Set(["/play", "/lobby", "/history", "/leaderboard", "/me"]);

/** Routes that show their own Sign in to signed-out visitors, so the header hides its own. */
export function isGatedRoute(routeId: string | null): boolean {
	return isGameRoomRoute(routeId) || (routeId !== null && GATED_ROUTE_IDS.has(routeId));
}

/** The tab bar stays out of game rooms. */
export function showsDock(routeId: string | null, showsMemberNav: boolean): boolean {
	return showsMemberNav && !isGameRoomRoute(routeId);
}

/** `/` only matches itself, so Home isn't current on every page. */
export function isCurrentPath(pathname: string, href: string): boolean {
	if (pathname === href) return true;
	return href !== "/" && pathname.startsWith(`${href}/`);
}

/** The active room's URL, or null when there is none or the viewer is already in it. */
export function liveGameHref(
	active: { code: string; type: GameType } | null | undefined,
	pathname: string
): string | null {
	if (!active) return null;
	const href = `/${active.type}/${active.code}`;
	return isCurrentPath(pathname, href) ? null : href;
}
