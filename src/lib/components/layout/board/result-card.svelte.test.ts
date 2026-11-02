import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import type { BoardFooter } from "./board.svelte";
import type { ResultView } from "./outcome.js";
import ResultCard from "./result-card.svelte";

const VIEW: ResultView = {
	headline: "Draw",
	tone: "draw",
	reason: null,
	rating: null,
	score: [
		{ name: "Player 1", score: 1 },
		{ name: "Player 2", score: 1 }
	],
	seats: [0, 1],
	actions: ["rematch"]
};

function ignore() {}

const FOOTER: BoardFooter = {
	isLive: true,
	round: 2,
	latestRound: 2,
	onResign: ignore,
	onRematch: ignore,
	onAbandon: ignore,
	onPlayAgain: ignore,
	onNewOpponent: ignore,
	onLobby: ignore,
	onGoLive: ignore,
	onGoToRound: ignore
};

describe("ResultCard", () => {
	test("the headline is an h2 by default", () => {
		render(ResultCard, { props: { view: VIEW, footer: FOOTER, onDismiss: ignore } });
		expect(screen.getByRole("heading", { level: 2, name: "Draw" })).toBeInTheDocument();
	});

	test("headingLevel sets the headline's level", () => {
		render(ResultCard, {
			props: { view: VIEW, footer: FOOTER, headingLevel: 4, onDismiss: ignore }
		});
		expect(screen.getByRole("heading", { level: 4, name: "Draw" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
	});
});
