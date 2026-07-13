import Root, {
	type BoardClock,
	type BoardFooter,
	type BoardPlayer,
	type BoardStatus
} from "./board.svelte";
import { getMood, setupMood, Mood } from "./mood.svelte.js";

export {
	Root,
	//
	Root as Board,
	type BoardClock,
	type BoardFooter,
	type BoardPlayer,
	type BoardStatus,
	getMood,
	setupMood,
	Mood
};
