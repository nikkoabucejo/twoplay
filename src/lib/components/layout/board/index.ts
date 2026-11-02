import Root, {
	BOARD_SIZE,
	type BoardClock,
	type BoardFooter,
	type BoardPlayer,
	type BoardStatus
} from "./board.svelte";
import BoardPlaceholder from "./board-placeholder.svelte";
import { ringSeat, stripLine, stripSeats, type StripLine } from "./strips.js";

export {
	Root,
	//
	Root as Board,
	BOARD_SIZE,
	BoardPlaceholder,
	type BoardClock,
	type BoardFooter,
	type BoardPlayer,
	type BoardStatus,
	ringSeat,
	stripLine,
	stripSeats,
	type StripLine
};
