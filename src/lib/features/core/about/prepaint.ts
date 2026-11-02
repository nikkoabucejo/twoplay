import { parsePreferences, PREFERENCES_KEY } from "$lib/utils/storage";

export const ABOUT_BUILD_KEY = "twoplay:about-built";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type StoredItem = Pick<Storage, "getItem">;
type MatchMedia = (query: string) => { matches: boolean };

/**
 * The OS setting or the app's "Always reduce" setting, read from storage rather than the
 * `.reduce-motion` class, which the layout applies after this page's first effect.
 */
export function isReducedMotion(local: () => StoredItem, matchMedia: MatchMedia): boolean {
	if (matchMedia(REDUCED_MOTION_QUERY).matches) return true;
	try {
		return parsePreferences(local().getItem(PREFERENCES_KEY)).motion === "reduce";
	} catch {
		return false;
	}
}

/** Blocked session storage (a throwing getter or getItem) counts as a first visit. */
export function shouldAutoplay(
	session: () => StoredItem,
	local: () => StoredItem,
	matchMedia: MatchMedia
): boolean {
	if (isReducedMotion(local, matchMedia)) return false;
	try {
		return session().getItem(ABOUT_BUILD_KEY) === null;
	} catch {
		return true;
	}
}

// Runs during HTML parse, before hydration, so it repeats shouldAutoplay's logic inline.
export const PREPAINT_SCRIPT = `<script>try{var s=null,r=false;try{s=sessionStorage.getItem(${JSON.stringify(ABOUT_BUILD_KEY)})}catch(e){}try{r=JSON.parse(localStorage.getItem(${JSON.stringify(PREFERENCES_KEY)})).motion==="reduce"}catch(e){}if(s===null&&!r&&!matchMedia(${JSON.stringify(REDUCED_MOTION_QUERY)}).matches)document.documentElement.dataset.aboutBuild="pending"}catch(e){}</script>`;
