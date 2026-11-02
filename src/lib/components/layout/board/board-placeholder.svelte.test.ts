import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import { BOARD_SIZE, BoardPlaceholder } from "./index.js";

describe("BoardPlaceholder", () => {
	test("announces that the room is loading", () => {
		render(BoardPlaceholder);
		expect(screen.getByRole("status")).toHaveTextContent("Loading game");
	});

	test("holds the spinner in a square area the board's width", () => {
		render(BoardPlaceholder);
		const area = screen.getByRole("status").parentElement;
		expect(area).toHaveClass("aspect-square", "w-(--board-size)");
	});

	test("reserves a strip slot above and below the board area, then the round controls", () => {
		const { container } = render(BoardPlaceholder);
		const area = screen.getByRole("status").parentElement!;
		const column = area.parentElement!;
		const [upper, board, lower, footer] = column.children;
		expect(column.children).toHaveLength(4);
		expect(board).toBe(area);
		for (const strip of [upper, lower]) expect(strip).toHaveClass("h-14", "w-(--board-size)");
		expect(footer).toHaveAttribute("data-slot", "footer");
		const [controls, round, error] = footer.children;
		expect(footer.children).toHaveLength(3);
		expect(controls).toHaveClass("h-8");
		expect(round).toHaveClass("h-4");
		expect(error).toHaveClass("h-5");
		expect(container.querySelector(".size-10")).not.toBeInTheDocument();
	});

	test("the board size defaults to BOARD_SIZE", () => {
		const { container } = render(BoardPlaceholder);
		const root = container.querySelector<HTMLElement>("[style]");
		expect(root?.style.getPropertyValue("--board-size")).toBe(BOARD_SIZE);
	});

	test("takes a custom board size", () => {
		const { container } = render(BoardPlaceholder, { props: { size: "20rem" } });
		const root = container.querySelector<HTMLElement>("[style]");
		expect(root?.style.getPropertyValue("--board-size")).toBe("20rem");
	});
});
