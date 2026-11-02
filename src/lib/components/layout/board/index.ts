import Root, {
	type BoardClock,
	type BoardFooter,
	type BoardPlayer,
	type BoardStatus
} from "./board.svelte";
import BoardPlaceholder from "./board-placeholder.svelte";
import { rovingStep, scrubCommand, type ScrubCommand } from "./keys.js";
import { resultView, type ResultAction, type ResultView } from "./outcome.js";
import ResultCard from "./result-card.svelte";
import { roomStatus } from "./status.js";
import { MOVE_DOT, SELECTED_RING, squareClass } from "./squares.js";

export {
	Root,
	//
	Root as Board,
	BoardPlaceholder,
	type BoardClock,
	type BoardFooter,
	type BoardPlayer,
	type BoardStatus,
	MOVE_DOT,
	resultView,
	ResultCard,
	type ResultAction,
	type ResultView,
	roomStatus,
	rovingStep,
	scrubCommand,
	type ScrubCommand,
	SELECTED_RING,
	squareClass
};
