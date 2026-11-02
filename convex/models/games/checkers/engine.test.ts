import { describe, expect, test } from "vitest";
import { checkersEngine, type CheckersMove, type CheckersState } from "./engine.js";
import { idx, rc, type PieceColor, type Square } from "./rules.js";

const { applyMove, createInitialState, roundWinner, status } = checkersEngine;

type Placement = [row: number, col: number, color: PieceColor, king?: boolean];

function stateOf(
	turn: PieceColor,
	pieces: Placement[],
	mustContinueFrom: number | null = null
): CheckersState {
	const board: Square[] = Array(64).fill(null);
	for (const [row, col, color, king = false] of pieces) board[idx(row, col)] = { color, king };
	return { kind: "checkers", board, turn, mustContinueFrom };
}

function move(from: [number, number], to: [number, number]): CheckersMove {
	return { kind: "checkers", from: idx(...from), to: idx(...to) };
}

function at(state: CheckersState, row: number, col: number): Square {
	return state.board[idx(row, col)];
}

describe("engine metadata", () => {
	test("is a two-player checkers engine", () => {
		expect(checkersEngine.kind).toBe("checkers");
		expect(checkersEngine.playerCount).toBe(2);
	});
});

describe("createInitialState", () => {
	const state = createInitialState();
	const occupied = state.board
		.map((square, i) => ({ square, row: rc(i)[0], col: rc(i)[1] }))
		.filter(({ square }) => square !== null);

	test("has 64 squares", () => {
		expect(state.board).toHaveLength(64);
	});

	test("places twelve pink men on rows 0 to 2", () => {
		const pink = occupied.filter(({ square }) => square?.color === "pink");
		expect(pink).toHaveLength(12);
		expect(pink.every(({ row, square }) => row <= 2 && square?.king === false)).toBe(true);
	});

	test("places twelve cyan men on rows 5 to 7", () => {
		const cyan = occupied.filter(({ square }) => square?.color === "cyan");
		expect(cyan).toHaveLength(12);
		expect(cyan.every(({ row, square }) => row >= 5 && square?.king === false)).toBe(true);
	});

	test("only occupies dark squares", () => {
		expect(occupied.every(({ row, col }) => (row + col) % 2 === 1)).toBe(true);
	});

	test("leaves rows 3 and 4 empty", () => {
		expect(occupied.some(({ row }) => row === 3 || row === 4)).toBe(false);
	});

	test("starts with cyan to move and no capture chain", () => {
		expect(state.turn).toBe("cyan");
		expect(state.mustContinueFrom).toBeNull();
	});

	test("is an in-progress game with player 0 to move", () => {
		expect(status(state)).toEqual({ turnIndex: 0, winnerIndex: null, isOver: false });
	});
});

describe("turn order", () => {
	test("a simple move relocates the piece and passes the turn", () => {
		const next = applyMove(createInitialState(), 0, move([5, 2], [4, 3]));
		expect(at(next, 5, 2)).toBeNull();
		expect(at(next, 4, 3)).toEqual({ color: "cyan", king: false });
		expect(next.turn).toBe("pink");
		expect(status(next).turnIndex).toBe(1);
	});

	test("player 1 moving first throws Not your turn", () => {
		expect(() => applyMove(createInitialState(), 1, move([2, 1], [3, 2]))).toThrow("Not your turn");
	});

	test("player 0 moving twice in a row throws Not your turn", () => {
		const next = applyMove(createInitialState(), 0, move([5, 2], [4, 3]));
		expect(() => applyMove(next, 0, move([4, 3], [3, 2]))).toThrow("Not your turn");
	});

	test("player 1 moves pink after player 0", () => {
		const afterCyan = applyMove(createInitialState(), 0, move([5, 2], [4, 3]));
		const afterPink = applyMove(afterCyan, 1, move([2, 1], [3, 2]));
		expect(at(afterPink, 3, 2)).toEqual({ color: "pink", king: false });
		expect(afterPink.turn).toBe("cyan");
	});

	test("does not mutate the input state", () => {
		const state = createInitialState();
		applyMove(state, 0, move([5, 2], [4, 3]));
		expect(at(state, 5, 2)).toEqual({ color: "cyan", king: false });
		expect(at(state, 4, 3)).toBeNull();
		expect(state.turn).toBe("cyan");
	});
});

describe("illegal moves leave the state unchanged", () => {
	const initial = createInitialState();

	test.each([
		["a two-square step", move([5, 2], [3, 4])],
		["a sideways step", move([5, 2], [5, 4])],
		["moving the opponent's piece", move([2, 1], [3, 2])],
		["moving from an empty square", move([4, 3], [3, 2])],
		["stepping onto an occupied square", move([6, 1], [5, 2])]
	])("%s", (_, illegal) => {
		expect(applyMove(initial, 0, illegal)).toBe(initial);
	});

	test.each([
		["below the board", -1],
		["past the board", 64],
		["fractional", 41.5]
	])("a from index %s", (_, from) => {
		expect(applyMove(initial, 0, { kind: "checkers", from, to: idx(4, 3) })).toBe(initial);
	});

	test("a man stepping backwards", () => {
		const state = stateOf("cyan", [
			[4, 3, "cyan"],
			[0, 1, "pink"]
		]);
		expect(applyMove(state, 0, move([4, 3], [5, 4]))).toBe(state);
	});
});

describe("captures", () => {
	const capturable = stateOf("cyan", [
		[5, 2, "cyan"],
		[4, 3, "pink"],
		[6, 7, "cyan"],
		[0, 1, "pink"]
	]);

	test("a jump removes the captured piece and passes the turn", () => {
		const next = applyMove(capturable, 0, move([5, 2], [3, 4]));
		expect(at(next, 5, 2)).toBeNull();
		expect(at(next, 4, 3)).toBeNull();
		expect(at(next, 3, 4)).toEqual({ color: "cyan", king: false });
		expect(next.turn).toBe("pink");
		expect(next.mustContinueFrom).toBeNull();
	});

	test("a simple move is rejected while any capture is available", () => {
		expect(applyMove(capturable, 0, move([6, 7], [5, 6]))).toBe(capturable);
	});

	test("the capturing piece may also not step instead of jumping", () => {
		expect(applyMove(capturable, 0, move([5, 2], [4, 1]))).toBe(capturable);
	});
});

describe("multi-jump", () => {
	const chain = stateOf("cyan", [
		[5, 2, "cyan"],
		[4, 3, "pink"],
		[2, 5, "pink"],
		[7, 0, "cyan"],
		[0, 1, "pink"]
	]);
	const midChain = applyMove(chain, 0, move([5, 2], [3, 4]));

	test("a jump with another jump available keeps the turn and pins the piece", () => {
		expect(at(midChain, 4, 3)).toBeNull();
		expect(midChain.turn).toBe("cyan");
		expect(midChain.mustContinueFrom).toBe(idx(3, 4));
	});

	test("the game is still in progress with the same player to move mid-chain", () => {
		expect(status(midChain)).toEqual({ turnIndex: 0, winnerIndex: null, isOver: false });
	});

	test("another piece cannot move mid-chain", () => {
		expect(applyMove(midChain, 0, move([7, 0], [6, 1]))).toBe(midChain);
	});

	test("the opponent moving mid-chain throws Not your turn", () => {
		expect(() => applyMove(midChain, 1, move([0, 1], [1, 2]))).toThrow("Not your turn");
	});

	test("finishing the chain captures again and passes the turn", () => {
		const done = applyMove(midChain, 0, move([3, 4], [1, 6]));
		expect(at(done, 2, 5)).toBeNull();
		expect(at(done, 1, 6)).toEqual({ color: "cyan", king: false });
		expect(done.turn).toBe("pink");
		expect(done.mustContinueFrom).toBeNull();
	});
});

describe("promotion", () => {
	test("a cyan man reaching row 0 becomes a king", () => {
		const state = stateOf("cyan", [
			[1, 2, "cyan"],
			[5, 0, "pink"]
		]);
		const next = applyMove(state, 0, move([1, 2], [0, 1]));
		expect(at(next, 0, 1)).toEqual({ color: "cyan", king: true });
	});

	test("a pink man reaching row 7 becomes a king", () => {
		const state = stateOf("pink", [
			[6, 1, "pink"],
			[2, 7, "cyan"]
		]);
		const next = applyMove(state, 1, move([6, 1], [7, 0]));
		expect(at(next, 7, 0)).toEqual({ color: "pink", king: true });
	});

	test("a man is promoted when a capture lands on the far row", () => {
		const state = stateOf("cyan", [
			[2, 1, "cyan"],
			[1, 2, "pink"],
			[5, 0, "pink"]
		]);
		const next = applyMove(state, 0, move([2, 1], [0, 3]));
		expect(at(next, 0, 3)).toEqual({ color: "cyan", king: true });
	});

	test("a man is not promoted short of the far row", () => {
		const state = stateOf("cyan", [
			[2, 1, "cyan"],
			[5, 0, "pink"]
		]);
		const next = applyMove(state, 0, move([2, 1], [1, 2]));
		expect(at(next, 1, 2)).toEqual({ color: "cyan", king: false });
	});

	test("a king stays a king after moving off the far row", () => {
		const state = stateOf("cyan", [
			[0, 1, "cyan", true],
			[5, 0, "pink"]
		]);
		const next = applyMove(state, 0, move([0, 1], [1, 2]));
		expect(at(next, 1, 2)).toEqual({ color: "cyan", king: true });
	});

	test("a king moves backwards", () => {
		const state = stateOf("pink", [
			[4, 3, "pink", true],
			[7, 0, "cyan"]
		]);
		const next = applyMove(state, 1, move([4, 3], [3, 2]));
		expect(at(next, 3, 2)).toEqual({ color: "pink", king: true });
	});

	// Bug: applyMove crowns before checking for further jumps, so the new king keeps jumping backwards.
	test.fails("a man crowned by a capture ends the turn instead of jumping on as a king", () => {
		const state = stateOf("cyan", [
			[2, 1, "cyan"],
			[1, 2, "pink"],
			[1, 4, "pink"]
		]);
		const next = applyMove(state, 0, move([2, 1], [0, 3]));
		expect(next.mustContinueFrom).toBeNull();
		expect(next.turn).toBe("pink");
	});
});

describe("game over", () => {
	test("a side with no pieces left loses", () => {
		const state = stateOf("cyan", [[3, 2, "pink"]]);
		expect(status(state)).toEqual({ turnIndex: 0, winnerIndex: 1, isOver: true });
	});

	test("pink with no pieces left loses to player 0", () => {
		const state = stateOf("pink", [[3, 2, "cyan"]]);
		expect(status(state)).toEqual({ turnIndex: 1, winnerIndex: 0, isOver: true });
	});

	test("a side whose pieces are all blocked loses", () => {
		const state = stateOf("cyan", [
			[6, 1, "cyan"],
			[5, 0, "pink"],
			[5, 2, "pink"],
			[4, 3, "pink"]
		]);
		expect(status(state)).toMatchObject({ winnerIndex: 1, isOver: true });
	});

	test("capturing the last opposing piece wins", () => {
		const state = stateOf("cyan", [
			[5, 2, "cyan"],
			[4, 3, "pink"]
		]);
		const next = applyMove(state, 0, move([5, 2], [3, 4]));
		expect(status(next)).toEqual({ turnIndex: 1, winnerIndex: 0, isOver: true });
	});

	test("moves after the game is over leave the state unchanged", () => {
		const over = stateOf("cyan", [[3, 2, "pink"]]);
		expect(applyMove(over, 0, move([3, 2], [4, 3]))).toBe(over);
	});

	test("a move by the side not on turn after the game is over does not throw", () => {
		const over = stateOf("cyan", [[3, 2, "pink"]]);
		expect(applyMove(over, 1, move([3, 2], [4, 3]))).toBe(over);
	});
});

describe("roundWinner", () => {
	test("is null while the game is in progress", () => {
		expect(roundWinner(createInitialState())).toBeNull();
	});

	test("is the player whose opponent cannot move", () => {
		expect(roundWinner(stateOf("cyan", [[3, 2, "pink"]]))).toBe(1);
		expect(roundWinner(stateOf("pink", [[3, 2, "cyan"]]))).toBe(0);
	});
});
