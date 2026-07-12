import { getContext, setContext } from "svelte";
import type { BoardStatus } from "./board.svelte";

const CONTEXT_KEY = Symbol("mood");

export class Mood {
	status = $state<BoardStatus | null>(null);
}

// One instance per component tree, set once by the layout that owns the ambient background.
// Any Board mounted below it reports its status here without prop-drilling through every
// game page. Returns undefined where no layout has opted in, so Board stays usable standalone.
export function setupMood() {
	const mood = new Mood();
	setContext(CONTEXT_KEY, mood);
	return mood;
}

export function getMood(): Mood | undefined {
	return getContext<Mood | undefined>(CONTEXT_KEY);
}
