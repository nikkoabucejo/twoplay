import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { BOARD_SIZE } from "./board.svelte";
import { BoardPlaceholder } from "./index.js";

describe("BoardPlaceholder", () => {
	test("announces that the room is loading", () => {
		render(BoardPlaceholder);
		expect(screen.getByRole("status")).toHaveTextContent("Loading game");
	});

	test("shows a skeleton, not a spinner", () => {
		const { container } = render(BoardPlaceholder);
		expect(container.querySelector("[data-slot='spinner']")).not.toBeInTheDocument();
		expect(
			container.querySelector("[data-slot='board-area'] [data-slot='skeleton']")
		).toBeInTheDocument();
	});

	test("reserves the room bar, a strip above and below a square board area, then the round controls and notice line", () => {
		const { container } = render(BoardPlaceholder);
		const area = container.querySelector("[data-slot='board-area']")!;
		expect(area).toHaveClass("aspect-square", "w-(--board-size)");
		const column = area.parentElement!;
		const [roomBar, upper, board, lower, footer] = column.children;
		expect(column.children).toHaveLength(5);
		expect(roomBar).toHaveAttribute("data-slot", "room-bar");
		expect(board).toBe(area);
		for (const strip of [upper, lower]) expect(strip).toHaveClass("h-14", "w-(--board-size)");
		expect(footer).toHaveAttribute("data-slot", "footer");
		const [controls, notice] = footer.children;
		expect(footer.children).toHaveLength(2);
		expect(controls).toHaveClass("h-8");
		expect(notice).toHaveClass("h-5");
	});

	test("reserves the side panel's box beside the board column", () => {
		const { container } = render(BoardPlaceholder);
		const column = container.querySelector("[data-slot='board-area']")!.parentElement!;
		expect(column.nextElementSibling).toHaveAttribute("data-slot", "side-panel");
	});

	test("the board area takes BOARD_SIZE", () => {
		const { container } = render(BoardPlaceholder);
		const root = container.querySelector<HTMLElement>("[style]");
		expect(root?.style.getPropertyValue("--board-size")).toBe(BOARD_SIZE);
	});
});
