import { getPreferences, type Preferences } from "$lib/utils/storage";
import { playTurnChime } from "$lib/utils/sound";

const FLASH_INTERVAL_MS = 1000;

type AlertDocument = EventTarget & { title: string; readonly hidden: boolean };

type TurnAlertDeps = {
	document: AlertDocument;
	playChime: () => void;
	preferences: Pick<Preferences, "sound">;
};

/** `previous === null` is the first observation, so a room that loads on your turn stays quiet. */
export function shouldAlert(previous: boolean | null, next: boolean, isHidden: boolean): boolean {
	return previous === false && next && isHidden;
}

/**
 * Flashes the tab title, and chimes if sound is on, when the viewer's turn arrives in a hidden tab.
 * `getIsMyTurn` returns `null` while the turn is unknown (the room is loading); those reads are skipped.
 */
export class TurnAlert {
	constructor(getIsMyTurn: () => boolean | null, deps: Partial<TurnAlertDeps> = {}) {
		const preferences = deps.preferences ?? getPreferences();
		const playChime = deps.playChime ?? playTurnChime;
		// Resolved inside effects, which never run during SSR, where there is no `document`.
		const getDocument = () => deps.document ?? document;

		let previous: boolean | null = null;
		let originalTitle: string | null = null;
		let flash: ReturnType<typeof setInterval> | undefined;

		const stop = () => {
			clearInterval(flash);
			if (originalTitle === null) return;
			getDocument().title = originalTitle;
			originalTitle = null;
		};

		$effect(() => {
			const doc = getDocument();
			const isMyTurn = getIsMyTurn();
			if (isMyTurn === null) return;
			if (shouldAlert(previous, isMyTurn, doc.hidden)) {
				const original = doc.title;
				const alertTitle = `Your turn · ${original}`;
				originalTitle = original;
				doc.title = alertTitle;
				flash = setInterval(() => {
					doc.title = doc.title === alertTitle ? original : alertTitle;
				}, FLASH_INTERVAL_MS);
				if (preferences.sound) playChime();
			} else if (!isMyTurn) {
				stop();
			}
			previous = isMyTurn;
		});

		$effect(() => {
			const doc = getDocument();
			const onVisibilityChange = () => {
				if (!doc.hidden) stop();
			};
			doc.addEventListener("visibilitychange", onVisibilityChange);
			return () => {
				doc.removeEventListener("visibilitychange", onVisibilityChange);
				stop();
			};
		});
	}
}
