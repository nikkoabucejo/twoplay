import { describe, expect, test } from "vitest";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
import { idx } from "../../../../../convex/models/games/checkers/rules.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import { demoSteps, movePieceIds, pieceIds } from "./demo.js";

const cell = (boardIndex: number, cellIndex: number) => ({
	move: { kind: "tictactoe" as const, boardIndex, cellIndex }
});

describe("demoSteps", () => {
	test("plays accepted moves for alternating seats", () => {
		const steps = demoSteps(tictactoeEngine, tictactoeEngine.createInitialState(), [
			cell(4, 4),
			cell(0, 0)
		]);
		expect(steps.map((step) => step.seat)).toEqual([0, 1]);
		expect(steps.map((step) => step.rejection)).toEqual([null, null]);
		expect(steps[1].state.boards[4][4]).toBe("X");
		expect(steps[1].state.boards[0][0]).toBe("O");
	});

	test("records the engine's reason and keeps the position when it throws", () => {
		const steps = demoSteps(tictactoeEngine, tictactoeEngine.createInitialState(), [
			cell(4, 4),
			cell(0, 0),
			cell(4, 0)
		]);
		expect(steps[2].rejection).toBe("You can't play the board you played last turn");
		expect(steps[2].state).toBe(steps[1].state);
	});

	test("uses the action's note when the engine ignores the move", () => {
		const steps = demoSteps(checkersEngine, checkersEngine.createInitialState(), [
			{ move: { kind: "checkers", from: idx(5, 0), to: idx(3, 0) }, note: "Too far" }
		]);
		expect(steps[0].rejection).toBe("Too far");
		expect(steps[0].seat).toBe(0);
	});

	test("plays chess moves for alternating seats", () => {
		const steps = demoSteps(chessEngine, chessEngine.createInitialState(), [
			{ move: { kind: "chess", from: "e2", to: "e4" } },
			{ move: { kind: "chess", from: "e7", to: "e5" } }
		]);
		expect(steps.map((step) => step.seat)).toEqual([0, 1]);
		expect(steps.map((step) => step.rejection)).toEqual([null, null]);
		expect(steps[1].state.fen).toBe("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2");
	});

	test("keeps the position when chess refuses a move", () => {
		const start = chessEngine.createInitialState();
		const steps = demoSteps(chessEngine, start, [
			{ move: { kind: "chess", from: "g1", to: "g3" } }
		]);
		expect(steps[0].state).toBe(start);
		expect(steps[0].rejection).toBe("That move isn't allowed");
	});
});

describe("pieceIds", () => {
	test("numbers each piece by its starting square", () => {
		const ids = pieceIds(checkersEngine.createInitialState().board);
		expect(ids[idx(0, 1)]).toBe(idx(0, 1));
		expect(ids[idx(3, 0)]).toBeNull();
	});
});

describe("movePieceIds", () => {
	test("carries the id along a step", () => {
		const ids = movePieceIds(
			pieceIds(checkersEngine.createInitialState().board),
			idx(5, 0),
			idx(4, 1)
		);
		expect(ids[idx(4, 1)]).toBe(idx(5, 0));
		expect(ids[idx(5, 0)]).toBeNull();
	});

	test("drops the jumped piece's id", () => {
		const ids: (number | null)[] = Array(64).fill(null);
		ids[idx(5, 2)] = 1;
		ids[idx(4, 3)] = 2;
		const next = movePieceIds(ids, idx(5, 2), idx(3, 4));
		expect(next[idx(3, 4)]).toBe(1);
		expect(next[idx(4, 3)]).toBeNull();
	});
});
