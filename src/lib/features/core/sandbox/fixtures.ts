import {
	resultView,
	type BoardFooter,
	type BoardPlayer,
	type BoardStatus,
	type ResultView
} from "$lib/components/layout";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import type { CheckersState } from "../../../../../convex/models/games/checkers/index.js";
import {
	computeLegalMoves,
	idx,
	type Square as CheckersSquare
} from "../../../../../convex/models/games/checkers/rules.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
import type { ChessState } from "../../../../../convex/models/games/chess/index.js";
import {
	boardOf,
	checkedKing,
	legalMoves,
	seatOfColor,
	squareIndex,
	turnOf,
	type Color,
	type Square
} from "../../../../../convex/models/games/chess/rules.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import type { TictactoeState } from "../../../../../convex/models/games/tictactoe/index.js";
import { pieceIds } from "../rules/index.js";

function playTictactoe(label: string, moves: [boardIndex: number, cellIndex: number][]) {
	let position = tictactoeEngine.createInitialState();
	moves.forEach(([boardIndex, cellIndex], turn) => {
		position = tictactoeEngine.applyMove(position, turn % 2, {
			kind: "tictactoe",
			boardIndex,
			cellIndex
		});
	});
	const [boardIndex, cellIndex] = moves[moves.length - 1];
	const seat: 0 | 1 = moves.length % 2 === 1 ? 0 : 1;
	return { label, position, lastMove: { boardIndex, cellIndex, seat } };
}

export const TICTACTOE = {
	boardWon: playTictactoe("Board won", [
		[0, 0],
		[1, 0],
		[2, 0],
		[3, 0],
		[0, 1],
		[1, 1],
		[2, 1],
		[3, 1],
		[0, 2]
	]),
	// X takes the top row of boards while O fills two boards without a line.
	gameWon: playTictactoe("Game won", [
		[0, 0],
		[3, 0],
		[1, 0],
		[4, 0],
		[2, 0],
		[3, 1],
		[0, 1],
		[4, 1],
		[1, 1],
		[3, 5],
		[2, 1],
		[4, 5],
		[0, 2],
		[3, 6],
		[1, 2],
		[4, 6],
		[2, 2]
	]),
	// Every board is won, X O X / X O O / O X X, with no line of boards.
	draw: playTictactoe("Draw", [
		[0, 0],
		[0, 6],
		[2, 0],
		[1, 0],
		[0, 1],
		[2, 6],
		[2, 1],
		[1, 1],
		[0, 2],
		[4, 0],
		[2, 2],
		[1, 2],
		[3, 0],
		[4, 1],
		[7, 0],
		[5, 0],
		[3, 1],
		[4, 2],
		[7, 1],
		[6, 0],
		[3, 2],
		[5, 1],
		[8, 0],
		[6, 1],
		[7, 2],
		[5, 2],
		[8, 1],
		[6, 2],
		[8, 2]
	])
};

type CheckersPreview = {
	label: string;
	state: CheckersState;
	ids: (number | null)[];
	selected: number | null;
	destinations: number[];
	forced: number[];
	lastMove: { from: number; to: number; seat: 0 | 1 } | null;
};

function checkersPreview(
	label: string,
	state: CheckersState,
	selected: number | null,
	lastMove: CheckersPreview["lastMove"] = null
): CheckersPreview {
	const moves = computeLegalMoves(state.board, state.turn, state.mustContinueFrom);
	const isCaptureForced = moves.length > 0 && moves.every((move) => move.captured !== null);
	return {
		label,
		state,
		ids: pieceIds(state.board),
		selected,
		destinations: moves.filter((move) => move.from === selected).map((move) => move.to),
		forced: isCaptureForced ? [...new Set(moves.map((move) => move.from))] : [],
		lastMove
	};
}

function playCheckers(moves: [from: number, to: number][]): CheckersState {
	return moves.reduce(
		(state, [from, to], turn) =>
			checkersEngine.applyMove(state, turn % 2, { kind: "checkers", from, to }),
		checkersEngine.createInitialState()
	);
}

function kingsBoard(): CheckersSquare[] {
	const board: CheckersSquare[] = Array(64).fill(null);
	board[idx(4, 3)] = { color: "cyan", king: true };
	board[idx(6, 1)] = { color: "cyan", king: false };
	board[idx(7, 4)] = { color: "cyan", king: false };
	board[idx(1, 6)] = { color: "pink", king: true };
	board[idx(1, 2)] = { color: "pink", king: false };
	board[idx(0, 5)] = { color: "pink", king: false };
	return board;
}

export const CHECKERS = {
	selected: checkersPreview("Selected piece", checkersEngine.createInitialState(), idx(5, 2)),
	mustCapture: checkersPreview(
		"Must capture",
		playCheckers([
			[idx(5, 2), idx(4, 3)],
			[idx(2, 1), idx(3, 2)]
		]),
		null,
		{ from: idx(2, 1), to: idx(3, 2), seat: 1 }
	),
	kings: checkersPreview(
		"Kings",
		{ kind: "checkers", board: kingsBoard(), turn: "cyan", mustContinueFrom: null },
		idx(4, 3)
	)
};

type ChessPreview = {
	label: string;
	state: ChessState;
	board: ReturnType<typeof boardOf>;
	selected: Square | null;
	destinations: Square[];
	lastMove: { from: Square; to: Square; seat: 0 | 1 } | null;
	checkSquare: Square | null;
};

function playChess(
	label: string,
	moves: [from: Square, to: Square][],
	selected: Square | null = null
): ChessPreview {
	let state = chessEngine.createInitialState();
	let lastMove: ChessPreview["lastMove"] = null;
	for (const [from, to] of moves) {
		const seat = seatOfColor(turnOf(state.fen));
		state = chessEngine.applyMove(state, seat, { kind: "chess", from, to });
		lastMove = { from, to, seat };
	}
	return {
		label,
		state,
		board: boardOf(state.fen),
		selected,
		destinations: legalMoves(state.fen)
			.filter((move) => move.from === selected)
			.map((move) => move.to),
		lastMove,
		checkSquare: checkedKing(state.fen)
	};
}

export const CHESS = {
	lastMove: playChess("Last move", [["e2", "e4"]]),
	selected: playChess(
		"Selected piece",
		[
			["e2", "e4"],
			["d7", "d5"]
		],
		"e4"
	),
	check: playChess("Check", [
		["e2", "e4"],
		["f7", "f5"],
		["d1", "h5"]
	]),
	checkmate: playChess("Checkmate", [
		["f2", "f3"],
		["e7", "e5"],
		["g2", "g4"],
		["d8", "h4"]
	])
};

/** A pawn one step from promoting, and the board drawn with it already on the last rank, where the
 *  picker opens in a game. */
function promotion(fen: string, from: Square, to: Square) {
	const board = boardOf(fen);
	board[squareIndex(to)] = board[squareIndex(from)];
	board[squareIndex(from)] = null;
	const seat = seatOfColor(turnOf(fen));
	return { fen, from, to, board, lastMove: { from, to, seat } };
}

export const PROMOTIONS: Record<Color, ReturnType<typeof promotion>> = {
	w: promotion("4k3/1P6/8/8/8/8/8/4K3 w - - 0 1", "b7", "b8"),
	b: promotion("4k3/8/8/8/8/8/1p6/4K3 b - - 0 1", "b2", "b1")
};

const NAMES: [{ name: string; score: number }, { name: string; score: number }] = [
	{ name: "Player 1", score: 2 },
	{ name: "Player 2", score: 1 }
];

function result(
	label: string,
	status: BoardStatus,
	mmr: number
): { label: string; view: ResultView } {
	const view = resultView({
		status,
		myIndex: 0,
		players: NAMES,
		isLive: true,
		isViewingHistory: false,
		isRoomClosed: false,
		mmr
	});
	if (!view) throw new Error(`${label} has no result card`);
	return { label, view };
}

export const RESULTS = [
	result("Win", { type: "winner", player: 0 }, 8),
	result("Loss", { type: "winner", player: 1 }, -8),
	result("Draw", { type: "draw" }, 0),
	result("Timeout", { type: "winner", player: 1, reason: "timeout" }, -8)
];

export const RESULT_PLAYERS: [BoardPlayer, BoardPlayer] = [
	{ label: "Player 1", emoji: "1f60e" },
	{ label: "Player 2", emoji: "1f525" }
];

function ignore() {}

/** The card's buttons do nothing here: there is no room to act on. */
export const RESULT_FOOTER: BoardFooter = {
	isLive: true,
	round: 3,
	latestRound: 3,
	onResign: ignore,
	onRematch: ignore,
	onAbandon: ignore,
	onPlayAgain: ignore,
	onNewOpponent: ignore,
	onLobby: ignore,
	onGoLive: ignore,
	onGoToRound: ignore
};
