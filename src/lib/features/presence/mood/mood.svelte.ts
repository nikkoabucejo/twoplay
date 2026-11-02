import { getContext, setContext } from "svelte";
import type { BoardStatus } from "$lib/components/layout";

const CONTEXT_KEY = Symbol("mood");

export class MoodPresence {
	status = $state<BoardStatus | null>(null);
	// Set by the play page while queued for a quick match; ignored when a board status is set.
	searching = $state(false);
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
