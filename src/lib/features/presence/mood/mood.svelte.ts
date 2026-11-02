import { getContext, setContext } from "svelte";
import type { BoardStatus, ResultView } from "$lib/components/layout";

const CONTEXT_KEY = Symbol("mood");

export class MoodPresence {
	status = $state<BoardStatus | null>(null);
	// Set by the play page while queued for a quick match; ignored when a board status is set.
	searching = $state(false);
	/** The viewer's result while the board shows their ended live round. */
	outcome = $state<Exclude<ResultView["tone"], "neutral"> | null>(null);
}

// One instance per component tree, set once by the layout that owns the ambient background.
// Any Board mounted below it reports its status here without prop-drilling through every
// game page. Returns undefined where no layout has opted in, so Board stays usable standalone.
export function setupMood() {
	const mood = new MoodPresence();
	setContext(CONTEXT_KEY, mood);
	return mood;
}

export function getMood(): MoodPresence | undefined {
	return getContext<MoodPresence | undefined>(CONTEXT_KEY);
}
