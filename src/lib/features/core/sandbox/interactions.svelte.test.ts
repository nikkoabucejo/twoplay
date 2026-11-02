import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { beforeAll, describe, expect, test, vi } from "vitest";
import Interactions from "./interactions.svelte";

// Keeps lottie-web inert, as in playing.svelte.test.ts: it paints a 1x1 canvas on load, then fetches JSON.
// Emoji imports it lazily, so load it here while the stub is in place rather than after the last test.
beforeAll(async () => {
	const proxyImageContext = { fillStyle: "", fillRect() {} } as unknown as CanvasRenderingContext2D;
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(proxyImageContext);
	vi.stubGlobal(
		"XMLHttpRequest",
		class {
			open() {}
			send() {}
		}
	);
	await import("lottie-web");
});

const PROMOTION = "Promotion (select the pawn)";

function preview(group: string, name: string) {
	return within(screen.getByRole("region", { name: group })).getByRole("figure", { name });
}

function captions(group: string) {
	return within(screen.getByRole("region", { name: group }))
		.getAllByRole("figure")
		.map((figure) => figure.querySelector("figcaption")?.textContent?.trim());
}

describe("Interactions", () => {
	test("labels a preview for every state", () => {
		render(Interactions);
		expect(captions("Tic-Tac-Toe")).toEqual(["Board won", "Game won", "Draw"]);
		expect(captions("Checkers")).toEqual(["Selected piece", "Must capture", "Kings"]);
		expect(captions("Chess")).toEqual([
			"Last move",
			"Selected piece",
			"Check",
			"Checkmate",
			PROMOTION
		]);
		expect(captions("Result cards")).toEqual(["Win", "Loss", "Draw", "Timeout"]);
	});

	test("names each board after its preview", () => {
		render(Interactions);
		expect(
			within(preview("Chess", "Check")).getByRole("group", { name: "Check" })
		).toBeInTheDocument();
		expect(
			within(preview("Chess", PROMOTION)).getByRole("group", { name: "Promotion" })
		).toBeInTheDocument();
	});

	test("the tic-tac-toe win draws its strike line", () => {
		render(Interactions);
		expect(preview("Tic-Tac-Toe", "Board won").querySelector("svg line")).toBeInTheDocument();
	});

	test("the chess check preview labels the king's square in check", () => {
		render(Interactions);
		expect(
			within(preview("Chess", "Check")).getByRole("button", { name: "e8, Player 2 king, in check" })
		).toBeInTheDocument();
	});

	test("shows four result cards", () => {
		render(Interactions);
		const group = screen.getByRole("region", { name: "Result cards" });
		const headlines = within(group)
			.getAllByRole("heading", { level: 4 })
			.map((heading) => heading.textContent?.trim());
		expect(headlines).toEqual(["You won", "You lost", "Draw", "You lost"]);
	});

	test("opening the promotion preview offers Queen, Rook, Bishop, and Knight", async () => {
		render(Interactions);
		await fireEvent.click(
			within(preview("Chess", PROMOTION)).getByRole("button", { name: /^b8,/ })
		);
		const picker = await screen.findByRole("dialog", { name: "Promote to" });
		const names = within(picker)
			.getAllByRole("button")
			.map((button) => button.getAttribute("aria-label"));
		expect(names).toEqual(["Queen", "Rook", "Bishop", "Knight"]);
	});

	test("cancelling the picker returns to the board", async () => {
		render(Interactions);
		await fireEvent.click(
			within(preview("Chess", PROMOTION)).getByRole("button", { name: /^b8,/ })
		);
		const picker = await screen.findByRole("dialog", { name: "Promote to" });
		await fireEvent.keyDown(picker, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
	});

	test("the color toggle moves the pawn to black's last rank", async () => {
		render(Interactions);
		const figure = preview("Chess", PROMOTION);
		await fireEvent.click(within(figure).getByRole("radio", { name: "Black" }));
		await fireEvent.click(within(figure).getByRole("button", { name: /^b1,/ }));
		expect(within(figure).getByRole("button", { name: /^b1,/ })).toHaveAccessibleName(
			"b1, Player 2 pawn"
		);
		expect(await screen.findByRole("dialog", { name: "Promote to" })).toBeInTheDocument();
	});
});
