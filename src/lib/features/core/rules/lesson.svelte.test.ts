import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import Lesson from "./lesson.svelte";

vi.mock("$lib/utils/sound", () => ({
	playCaptureSound: vi.fn(),
	playMoveSound: vi.fn(),
	prepareSound: vi.fn()
}));

beforeAll(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			observe() {}
			disconnect() {}
		}
	);
});

function headings() {
	return screen
		.getAllByRole("heading", { level: 2 })
		.map((heading) => within(heading).getByRole("button").textContent?.trim());
}

function currentStep() {
	return document.querySelector("[aria-current='step'] button")?.textContent?.trim();
}

describe("Lesson", () => {
	test("tic-tac-toe steps through the boards, switching, winning, clocks, and practice", () => {
		render(Lesson, { props: { type: "tictactoe" } });
		expect(headings()).toEqual([
			"Nine boards",
			"Switch boards",
			"Win a board",
			"Win the game",
			"Clocks",
			"Try it"
		]);
		expect(screen.getByText(/can't play the board you played last turn/)).toBeInTheDocument();
		expect(screen.getByText(/last open board/)).toBeInTheDocument();
		expect(screen.getByText(/Win three boards in a line/)).toBeInTheDocument();
		expect(screen.getByText(/If yours runs out, you lose/)).toBeInTheDocument();
	});

	test("checkers steps through moving, captures, multi-jumps, crowning, winning, and clocks", () => {
		render(Lesson, { props: { type: "checkers" } });
		expect(headings()).toEqual([
			"Moving",
			"Capturing",
			"Multi-jumps",
			"Crowning",
			"Winning",
			"Clocks",
			"Try it"
		]);
		expect(screen.getByText(/If you can capture, you must\./)).toBeInTheDocument();
		expect(screen.getByText(/keeps jumping/)).toBeInTheDocument();
		expect(screen.getByText(/reaches the far row becomes a king/)).toBeInTheDocument();
		expect(screen.getByText(/no legal move/)).toBeInTheDocument();
	});

	test("Next and Back move the current step", async () => {
		render(Lesson, { props: { type: "tictactoe" } });
		expect(screen.getByRole("button", { name: "Previous step" })).toBeDisabled();
		await fireEvent.click(screen.getByRole("button", { name: "Next" }));
		expect(currentStep()).toBe("Switch boards");
		expect(screen.getByText("Step 2 of 6: Switch boards")).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
		expect(currentStep()).toBe("Nine boards");
	});

	test("arrow keys step, and a step's heading jumps to it", async () => {
		render(Lesson, { props: { type: "checkers" } });
		await fireEvent.keyDown(window, { key: "ArrowRight" });
		expect(currentStep()).toBe("Capturing");
		await fireEvent.click(screen.getByRole("button", { name: "Crowning" }));
		expect(currentStep()).toBe("Crowning");
		await fireEvent.keyDown(window, { key: "ArrowLeft" });
		expect(currentStep()).toBe("Multi-jumps");
	});

	test("the last step is a practice board, with no Play link of its own", async () => {
		render(Lesson, { props: { type: "tictactoe" } });
		await fireEvent.click(screen.getByRole("button", { name: "Try it" }));
		expect(screen.getByRole("group", { name: "Practice board" })).toBeInTheDocument();
		expect(screen.getByText("Player 1 to move")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^Play/ })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
	});

	test("only the current step is selected", async () => {
		render(Lesson, { props: { type: "tictactoe" } });
		await fireEvent.click(screen.getByRole("button", { name: "Try it" }));
		const selected = document.querySelectorAll("li.selected-ring");
		expect(selected).toHaveLength(1);
		expect(selected[0]).toHaveAttribute("aria-current", "step");
	});

	test("practice moves go through the engine and report refusals", async () => {
		render(Lesson, { props: { type: "tictactoe" } });
		await fireEvent.click(screen.getByRole("button", { name: "Try it" }));
		await fireEvent.click(screen.getByRole("button", { name: "Board 5, cell 5, empty" }));
		expect(screen.getByText("Player 2 to move")).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: "Board 1, cell 1, empty" }));
		await fireEvent.click(screen.getByRole("button", { name: "Board 5, cell 1, closed" }));
		expect(screen.getByText("You can't play the board you played last turn")).toBeInTheDocument();
	});

	test("arrow keys inside the practice board don't change the step", async () => {
		render(Lesson, { props: { type: "tictactoe" } });
		await fireEvent.click(screen.getByRole("button", { name: "Try it" }));
		await fireEvent.keyDown(screen.getByRole("button", { name: "Board 1, cell 1, empty" }), {
			key: "ArrowLeft"
		});
		expect(currentStep()).toBe("Try it");
	});
});
