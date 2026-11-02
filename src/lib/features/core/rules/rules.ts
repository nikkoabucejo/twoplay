import type { GameType } from "../../../../../convex/models/games/index.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import type {
	CheckersMove,
	CheckersState
} from "../../../../../convex/models/games/checkers/index.js";
import { colorOfPlayer, idx } from "../../../../../convex/models/games/checkers/rules.js";
import type { Square } from "../../../../../convex/models/games/checkers/rules.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import type {
	TictactoeMove,
	TictactoeState
} from "../../../../../convex/models/games/tictactoe/index.js";
import type { Cell } from "../../../../../convex/models/games/tictactoe/rules.js";
import { demoSteps } from "./demo.js";
import type { DemoAction, DemoStep } from "./demo.js";

/** A scripted position and moves, replayed on a board. `caption` says what it shows, for screen
 *  readers and as its visible caption. */
export type BoardDemo =
	| {
			kind: "tictactoe";
			caption: string;
			start: TictactoeState;
			actions: readonly DemoAction<TictactoeMove>[];
			steps: readonly DemoStep<TictactoeState>[];
	  }
	| {
			kind: "checkers";
			caption: string;
			start: CheckersState;
			actions: readonly DemoAction<CheckersMove>[];
			steps: readonly DemoStep<CheckersState>[];
	  };

export type Demo = BoardDemo | { kind: "clocks"; caption: string };

export type RuleStep = { heading: string; body: string; demo: Demo };

export type GameRules = {
	/** One line for the rules index and the About page. */
	summary: string;
	/** The rules page's meta description. */
	description: string;
	steps: readonly RuleStep[];
	/** The looping demo on the game's card in the rules index. */
	preview: BoardDemo;
};

const CELLS: Record<string, Cell> = { x: "X", o: "O", ".": null };

/** `boards` holds nine strings of nine cells, row by row: `x`, `o`, or `.`. */
function tictactoeDemo(
	caption: string,
	boards: readonly string[],
	actions: readonly [boardIndex: number, cellIndex: number][],
	lastBoardBySymbol: TictactoeState["lastBoardBySymbol"] = { X: null, O: null }
): BoardDemo {
	const start: TictactoeState = {
		kind: "tictactoe",
		boards: boards.map((cells) => [...cells].map((cell) => CELLS[cell])),
		lastBoardBySymbol
	};
	const moves = actions.map(([boardIndex, cellIndex]) => ({
		move: { kind: "tictactoe" as const, boardIndex, cellIndex }
	}));
	return {
		kind: "tictactoe",
		caption,
		start,
		actions: moves,
		steps: demoSteps(tictactoeEngine, start, moves)
	};
}

const PIECES: Record<string, Square> = {
	a: { color: colorOfPlayer(0), king: false },
	A: { color: colorOfPlayer(0), king: true },
	b: { color: colorOfPlayer(1), king: false },
	B: { color: colorOfPlayer(1), king: true },
	".": null
};

type Point = readonly [row: number, col: number];

/** `rows` holds eight strings of eight squares, top to bottom: `a`/`b` for a seat's man, `A`/`B`
 *  for its king, `.` for empty. Seat 0 moves first and moves up. */
function checkersDemo(
	caption: string,
	rows: readonly string[],
	actions: readonly [from: Point, to: Point, note?: string][]
): BoardDemo {
	const start: CheckersState = {
		kind: "checkers",
		board: rows.flatMap((row) => [...row].map((square) => PIECES[square])),
		turn: colorOfPlayer(0),
		mustContinueFrom: null
	};
	const moves = actions.map(([from, to, note]) => ({
		move: { kind: "checkers" as const, from: idx(...from), to: idx(...to) },
		note
	}));
	return {
		kind: "checkers",
		caption,
		start,
		actions: moves,
		steps: demoSteps(checkersEngine, start, moves)
	};
}

const EMPTY = ".........";
const EMPTY_ROW = "........";

const CLOCKS: RuleStep = {
	heading: "Clocks",
	body: "Each player has a clock that runs only on their turn. If yours runs out, you lose.",
	demo: {
		kind: "clocks",
		caption: "Player 1 moves and their clock stops. Player 2's clock runs out, so Player 1 wins."
	}
};

const NINE_BOARDS = tictactoeDemo(
	"Players take turns placing a mark in any open board. A board you just played dims for your next turn.",
	[EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
	[
		[4, 4],
		[0, 0],
		[2, 6],
		[6, 2],
		[8, 4]
	]
);

const MULTI_JUMPS = checkersDemo(
	"One piece jumps twice in the same turn, taking two pieces.",
	[EMPTY_ROW, "b.......", EMPTY_ROW, "....b...", EMPTY_ROW, "..b.....", ".a......", EMPTY_ROW],
	[
		[
			[6, 1],
			[4, 3]
		],
		[
			[4, 3],
			[2, 5]
		],
		[
			[1, 0],
			[2, 1]
		]
	]
);

const TICTACTOE_STEPS: readonly RuleStep[] = [
	{
		heading: "Nine boards",
		body: "The grid is nine small tic-tac-toe boards. On your turn, place your mark in any empty cell of any open board.",
		demo: NINE_BOARDS
	},
	{
		heading: "Switch boards",
		body: "You can't play the board you played last turn. The only exception is when it is the last open board.",
		demo: tictactoeDemo(
			"Each player tries the board they just played, gets refused, and plays another board.",
			["o........", EMPTY, EMPTY, EMPTY, "....x....", EMPTY, EMPTY, EMPTY, EMPTY],
			[
				[4, 0],
				[6, 2],
				[0, 4],
				[4, 8]
			],
			{ X: 4, O: 0 }
		)
	},
	{
		heading: "Win a board",
		body: "Three of your marks in a row, column, or diagonal win that board. A board that is won or full is closed, and a full board with no line counts for nobody.",
		demo: tictactoeDemo(
			"Player 1 completes the top row of the corner board and takes it.",
			["xx.o.o...", EMPTY, EMPTY, EMPTY, "....o...x", EMPTY, EMPTY, EMPTY, EMPTY],
			[
				[0, 2],
				[2, 4]
			],
			{ X: 4, O: 0 }
		)
	},
	{
		heading: "Win the game",
		body: "Win three boards in a line, across, down, or diagonally. If every board closes with no line, the game is a draw.",
		demo: tictactoeDemo(
			"Player 1 wins the last corner board and with it three boards on the diagonal.",
			["xxxoo....", EMPTY, "o..o.....", EMPTY, "x.o.x.o.x", EMPTY, EMPTY, EMPTY, "x...x..o."],
			[
				[6, 4],
				[8, 8]
			],
			{ X: 4, O: 2 }
		)
	},
	CLOCKS
];

const CHECKERS_STEPS: readonly RuleStep[] = [
	{
		heading: "Moving",
		body: "Pieces sit on the dark squares. A piece moves one square diagonally forward onto an empty square.",
		demo: checkersDemo(
			"Each side steps a piece one square diagonally toward the other side.",
			[EMPTY_ROW, EMPTY_ROW, "...b.b..", EMPTY_ROW, EMPTY_ROW, "..a.a...", EMPTY_ROW, EMPTY_ROW],
			[
				[
					[5, 2],
					[4, 1]
				],
				[
					[2, 5],
					[3, 4]
				],
				[
					[4, 1],
					[3, 0]
				]
			]
		)
	},
	{
		heading: "Capturing",
		body: "Jump diagonally forward over an opponent's piece onto the empty square behind it to capture it. If you can capture, you must.",
		demo: checkersDemo(
			"Player 1 tries a quiet move, gets refused because a capture is open, and jumps instead.",
			[EMPTY_ROW, "......b.", EMPTY_ROW, EMPTY_ROW, "...b....", "..a.....", ".....a..", EMPTY_ROW],
			[
				[[6, 5], [5, 6], "If you can capture, you must"],
				[
					[5, 2],
					[3, 4]
				],
				[
					[1, 6],
					[2, 7]
				]
			]
		)
	},
	{
		heading: "Multi-jumps",
		body: "After a capture, if the same piece can capture again, it keeps jumping in the same turn. That includes a piece that was just crowned.",
		demo: MULTI_JUMPS
	},
	{
		heading: "Crowning",
		body: "A piece that reaches the far row becomes a king. Kings move and capture diagonally both forward and backward.",
		demo: checkersDemo(
			"A piece jumps onto the far row and is crowned, then jumps backward as a king.",
			[EMPTY_ROW, "..b.b...", ".a......", EMPTY_ROW, EMPTY_ROW, "......b.", EMPTY_ROW, EMPTY_ROW],
			[
				[
					[2, 1],
					[0, 3]
				],
				[
					[0, 3],
					[2, 5]
				],
				[
					[5, 6],
					[6, 7]
				]
			]
		)
	},
	{
		heading: "Winning",
		body: "If it's your turn and you have no legal move, including when you have no pieces left, you lose.",
		demo: checkersDemo(
			"Player 2's last piece is boxed in with no legal move, so Player 1 wins.",
			[EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, "a.a.....", ".b......", "a.a....."],
			[
				[
					[5, 2],
					[4, 3]
				]
			]
		)
	},
	CLOCKS
];

export const RULES: Record<GameType, GameRules> = {
	tictactoe: {
		summary: "Nine small boards in one big grid. Win three boards in a line.",
		description:
			"How to play Tic-Tac-Toe on twoplay: nine boards, switching boards, winning three in a line, and clocks.",
		steps: TICTACTOE_STEPS,
		preview: NINE_BOARDS
	},
	checkers: {
		summary: "Move diagonally, jump to capture, and crown your pieces on the far row.",
		description:
			"How to play Checkers on twoplay: diagonal moves, forced captures, multi-jumps, crowning, and clocks.",
		steps: CHECKERS_STEPS,
		preview: MULTI_JUMPS
	}
};
