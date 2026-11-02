import { describe, expect, test } from "vitest";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
import { RULES } from "./rules.js";
import type { BoardDemo } from "./rules.js";

function tictactoeDemo(heading: string) {
	const demo = RULES.tictactoe.steps.find((step) => step.heading === heading)?.demo;
	if (demo?.kind !== "tictactoe") throw new Error(`No tic-tac-toe demo for ${heading}`);
	return demo;
}

function checkersDemo(heading: string) {
	const demo = RULES.checkers.steps.find((step) => step.heading === heading)?.demo;
	if (demo?.kind !== "checkers") throw new Error(`No checkers demo for ${heading}`);
	return demo;
}

function rejections(demo: BoardDemo) {
	return demo.steps.map((step) => step.rejection);
}

describe("RULES", () => {
	test("the switch-boards demo is refused by the engine for each player's last board", () => {
		const reason = "You can't play the board you played last turn";
		expect(rejections(tictactoeDemo("Switch boards"))).toEqual([reason, null, reason, null]);
	});

	test("the tic-tac-toe win demos end the way the engine scores them", () => {
		const board = tictactoeDemo("Win a board");
		expect(board.steps.at(-1)?.state.boards[0].slice(0, 3)).toEqual(["X", "X", "X"]);
		const game = tictactoeDemo("Win the game");
		const last = game.steps.at(-1)?.state;
		expect(last && tictactoeEngine.status(last)).toMatchObject({ isOver: true, winnerIndex: 0 });
	});

	test("the capturing demo refuses a quiet move while a capture is open", () => {
		expect(rejections(checkersDemo("Capturing"))).toEqual([
			"If you can capture, you must",
			null,
			null
		]);
	});

	test("the multi-jump demo jumps twice in one turn", () => {
		const demo = checkersDemo("Multi-jumps");
		expect(demo.steps.map((step) => step.seat)).toEqual([0, 0, 1]);
		expect(rejections(demo)).toEqual([null, null, null]);
	});

	test("the crowning demo crowns the piece and keeps it jumping", () => {
		const demo = checkersDemo("Crowning");
		expect(rejections(demo)).toEqual([null, null, null]);
		expect(demo.steps[0].state.board[3]).toEqual({ color: "cyan", king: true });
		expect(demo.steps[1].seat).toBe(0);
	});

	test("the winning demo leaves the other side with no legal move", () => {
		const last = checkersDemo("Winning").steps.at(-1)?.state;
		expect(last && checkersEngine.status(last)).toMatchObject({ isOver: true, winnerIndex: 0 });
		expect(last?.board.some((square) => square?.color === "pink")).toBe(true);
	});

	test("every other demo move is legal", () => {
		for (const demo of [tictactoeDemo("Nine boards"), checkersDemo("Moving")]) {
			expect(rejections(demo).every((rejection) => rejection === null)).toBe(true);
		}
	});
});
