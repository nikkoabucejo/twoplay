import { describe, expect, test } from "vitest";
import { tictactoeEngine, type TictactoeMove, type TictactoeState } from "./engine.js";
import type { Cell } from "./rules.js";

const { applyMove, createInitialState, roundWinner, status } = tictactoeEngine;

const EMPTY = ".........";
const DRAWN = "XOXXOOOXX";
const WON_BY_X = "XXXOO....";
const WON_BY_O = "OOOXX....";

function cells(layout: string): Cell[] {
	return [...layout].map((ch) => (ch === "." ? null : (ch as "X" | "O")));
}

/** Builds a state from nine board strings ("X", "O", "." per cell). */
function stateOf(
	boards: string[],
	lastBoardBySymbol?: TictactoeState["lastBoardBySymbol"]
): TictactoeState {
	return { kind: "tictactoe", boards: boards.map(cells), lastBoardBySymbol };
}

function move(boardIndex: number, cellIndex: number): TictactoeMove {
	return { kind: "tictactoe", boardIndex, cellIndex };
}

/** Each board's winner laid out as the meta grid, using a full board per winner. */
function metaGrid(winners: string): string[] {
	return [...winners].map((w) => (w === "X" ? WON_BY_X : w === "O" ? WON_BY_O : EMPTY));
}

describe("engine metadata", () => {
	test("is a two-player tictactoe engine", () => {
		expect(tictactoeEngine.kind).toBe("tictactoe");
		expect(tictactoeEngine.playerCount).toBe(2);
	});
});

describe("createInitialState", () => {
	test("starts with nine empty nine-cell boards", () => {
		const state = createInitialState();
		expect(state.kind).toBe("tictactoe");
		expect(state.boards).toHaveLength(9);
		for (const board of state.boards) expect(board).toEqual(Array(9).fill(null));
	});

	test("starts with no board remembered for either mark", () => {
		expect(createInitialState().lastBoardBySymbol).toBeUndefined();
	});

	test("returns independent boards on each call", () => {
		const first = createInitialState();
		first.boards[0][0] = "X";
		expect(createInitialState().boards[0][0]).toBeNull();
	});

	test("is an in-progress game with player 0 to move", () => {
		expect(status(createInitialState())).toEqual({
			turnIndex: 0,
			winnerIndex: null,
			isOver: false
		});
	});
});

describe("turn order", () => {
	test("player 0 places an X", () => {
		const next = applyMove(createInitialState(), 0, move(4, 4));
		expect(next.boards[4][4]).toBe("X");
	});

	test("player 1 places an O on the following turn", () => {
		const afterX = applyMove(createInitialState(), 0, move(0, 0));
		const afterO = applyMove(afterX, 1, move(1, 0));
		expect(afterO.boards[1][0]).toBe("O");
	});

	test("the turn passes to player 1 after player 0 moves", () => {
		const next = applyMove(createInitialState(), 0, move(0, 0));
		expect(status(next).turnIndex).toBe(1);
	});

	test("player 1 moving first throws Not your turn", () => {
		expect(() => applyMove(createInitialState(), 1, move(0, 0))).toThrow("Not your turn");
	});

	test("player 0 moving twice in a row throws Not your turn", () => {
		const next = applyMove(createInitialState(), 0, move(0, 0));
		expect(() => applyMove(next, 0, move(1, 0))).toThrow("Not your turn");
	});

	test("the side to move is derived from how many cells are filled", () => {
		expect(status(stateOf(["X........", "O........", ...metaGrid(".......")])).turnIndex).toBe(0);
		expect(status(stateOf(["XO.X.....", ...metaGrid("........")])).turnIndex).toBe(1);
	});
});

describe("applyMove", () => {
	test("does not mutate the input state", () => {
		const state = createInitialState();
		applyMove(state, 0, move(0, 0));
		expect(state.boards[0][0]).toBeNull();
		expect(state.lastBoardBySymbol).toBeUndefined();
	});

	test("records the board each mark last played on", () => {
		const afterX = applyMove(createInitialState(), 0, move(3, 0));
		const afterO = applyMove(afterX, 1, move(5, 0));
		expect(afterO.lastBoardBySymbol).toEqual({ X: 3, O: 5 });
	});

	test("accepts a state saved before lastBoardBySymbol existed", () => {
		const legacy = stateOf(["X........", "O........", ...metaGrid(".......")]);
		const next = applyMove(legacy, 0, move(0, 1));
		expect(next.boards[0][1]).toBe("X");
		expect(next.lastBoardBySymbol).toEqual({ X: 0, O: null });
	});
});

describe("illegal moves leave the state unchanged", () => {
	test("playing an occupied cell", () => {
		const state = applyMove(createInitialState(), 0, move(0, 0));
		expect(applyMove(state, 1, move(0, 0))).toBe(state);
	});

	test("playing on a board that is already won", () => {
		const state = stateOf([WON_BY_X, ...metaGrid("........")]);
		expect(applyMove(state, status(state).turnIndex, move(0, 8))).toBe(state);
	});

	test.each([
		["board index past the last board", 9, 0],
		["negative board index", -1, 0],
		["fractional board index", 0.5, 0],
		["cell index past the last cell", 0, 9],
		["negative cell index", 0, -1],
		["fractional cell index", 0, 0.5]
	])("a move with a %s", (_, boardIndex, cellIndex) => {
		const state = createInitialState();
		expect(applyMove(state, 0, move(boardIndex, cellIndex))).toBe(state);
	});
});

describe("no repeating your previous board", () => {
	test("playing the board you played last turn throws", () => {
		const afterX = applyMove(createInitialState(), 0, move(0, 0));
		const afterO = applyMove(afterX, 1, move(1, 0));
		expect(() => applyMove(afterO, 0, move(0, 1))).toThrow(
			"You can't play the board you played last turn"
		);
	});

	test("the opponent may play the board you just played", () => {
		const afterX = applyMove(createInitialState(), 0, move(0, 0));
		const afterO = applyMove(afterX, 1, move(0, 4));
		expect(afterO.boards[0][4]).toBe("O");
	});

	test("you may return to a board after playing elsewhere", () => {
		let state = applyMove(createInitialState(), 0, move(0, 0));
		state = applyMove(state, 1, move(1, 0));
		state = applyMove(state, 0, move(2, 0));
		state = applyMove(state, 1, move(3, 0));
		state = applyMove(state, 0, move(0, 1));
		expect(state.boards[0][1]).toBe("X");
	});

	test("you may repeat your board when it is the only one still open", () => {
		const finished = [WON_BY_X, WON_BY_O, DRAWN, WON_BY_O, WON_BY_X, DRAWN, WON_BY_X, WON_BY_O];
		// The eight finished boards hold 48 marks, so one more X makes it O's turn.
		const state = stateOf([...finished, "X........"], { X: 8, O: 8 });
		expect(status(state).turnIndex).toBe(1);
		const next = applyMove(state, 1, move(8, 1));
		expect(next.boards[8][1]).toBe("O");
	});
});

describe("status", () => {
	test("three boards won in a line ends the game for that player", () => {
		expect(status(stateOf(metaGrid("XXX......")))).toMatchObject({ winnerIndex: 0, isOver: true });
	});

	test("player 1 wins with three O boards in a column", () => {
		expect(status(stateOf(metaGrid("O..O..O..")))).toMatchObject({
			winnerIndex: 1,
			isOver: true
		});
	});

	test("the move completing a meta line wins the game", () => {
		const state = stateOf([WON_BY_X, WON_BY_X, "XX.OO....", ...metaGrid("......")], {
			X: 1,
			O: 2
		});
		const next = applyMove(state, 0, move(2, 2));
		expect(status(next)).toMatchObject({ winnerIndex: 0, isOver: true });
	});

	test("every board finished with no meta line is a draw", () => {
		expect(status(stateOf(metaGrid("XOXXOOOXX")))).toMatchObject({
			winnerIndex: null,
			isOver: true
		});
	});

	test("every board drawn is a draw", () => {
		expect(status(stateOf(Array(9).fill(DRAWN)))).toMatchObject({
			winnerIndex: null,
			isOver: true
		});
	});

	test("the game continues while any board is open and no meta line exists", () => {
		expect(status(stateOf(metaGrid("XOXXOOOX.")))).toMatchObject({
			winnerIndex: null,
			isOver: false
		});
	});
});

describe("after the game is decided", () => {
	const won = stateOf(metaGrid("XXX......"));

	test("further moves leave the state unchanged", () => {
		expect(applyMove(won, status(won).turnIndex, move(5, 0))).toBe(won);
	});

	test("a move by the side not on turn does not throw", () => {
		const offTurn = status(won).turnIndex === 0 ? 1 : 0;
		expect(applyMove(won, offTurn, move(5, 0))).toBe(won);
	});
});

describe("roundWinner", () => {
	test("is null while the game is in progress", () => {
		expect(roundWinner(createInitialState())).toBeNull();
	});

	test("is the meta line winner once decided", () => {
		expect(roundWinner(stateOf(metaGrid("..X.X.X..")))).toBe(0);
		expect(roundWinner(stateOf(metaGrid("OOO......")))).toBe(1);
	});

	test("is null on a draw", () => {
		expect(roundWinner(stateOf(metaGrid("XOXXOOOXX")))).toBeNull();
	});
});
