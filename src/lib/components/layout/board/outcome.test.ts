import { describe, expect, test } from "vitest";
import { resultView, type ResultInput } from "./outcome.js";

const ALEX = { name: "Alex", score: 2 };
const BLAIR = { name: "Blair", score: 1 };

function input(overrides: Partial<ResultInput> = {}): ResultInput {
	return {
		status: { type: "winner", player: 0 },
		myIndex: 0,
		players: [ALEX, BLAIR],
		isLive: true,
		isViewingHistory: false,
		isRoomClosed: false,
		mmr: null,
		...overrides
	};
}

describe("resultView", () => {
	test("a seated winner by resignation reads You won and who resigned", () => {
		const view = resultView(input({ status: { type: "winner", player: 0, reason: "resign" } }));
		expect(view?.headline).toBe("You won");
		expect(view?.reason).toBe("Blair resigned");
	});

	test("the viewer's own resignation reads You resigned", () => {
		const view = resultView(input({ status: { type: "winner", player: 1, reason: "resign" } }));
		expect(view?.headline).toBe("You lost");
		expect(view?.reason).toBe("You resigned");
	});

	test("the viewer's clock running out reads Out of time", () => {
		const view = resultView(input({ status: { type: "winner", player: 1, reason: "timeout" } }));
		expect(view?.headline).toBe("You lost");
		expect(view?.reason).toBe("Out of time");
	});

	test("the opponent's clock running out names them", () => {
		const view = resultView(input({ status: { type: "winner", player: 0, reason: "timeout" } }));
		expect(view?.reason).toBe("Blair ran out of time");
	});

	test("a win on the board has no reason line", () => {
		expect(resultView(input())?.reason).toBeNull();
	});

	test("a draw reads Draw with no reason line", () => {
		const view = resultView(input({ status: { type: "draw" } }));
		expect(view?.headline).toBe("Draw");
		expect(view?.reason).toBeNull();
		expect(view?.rating).toEqual({ delta: "±0", text: "Rating unchanged", tone: "even" });
	});

	test("a spectator reads who won and sees no rating line", () => {
		const view = resultView(input({ myIndex: null, status: { type: "winner", player: 1 } }));
		expect(view?.headline).toBe("Blair won");
		expect(view?.rating).toBeNull();
	});

	test.each([
		[8, { delta: "+8", text: "+8 rating", tone: "gain" }],
		[-8, { delta: "−8", text: "-8 rating", tone: "loss" }],
		[0, { delta: "±0", text: "Rating unchanged", tone: "even" }],
		[null, { delta: "", text: "", tone: "pending" }]
	])("a settled change of %s reads %j", (mmr, rating) => {
		expect(resultView(input({ mmr }))?.rating).toEqual(rating);
	});

	test.each([
		["a win", { type: "winner", player: 0 }, 0, "win"],
		["a loss", { type: "winner", player: 1 }, 0, "loss"],
		["a draw", { type: "draw" }, 0, "draw"],
		["a spectator's win", { type: "winner", player: 1 }, null, "neutral"],
		["a spectator's draw", { type: "draw" }, null, "draw"]
	] as const)("%s sets the tone", (_, status, myIndex, tone) => {
		expect(resultView(input({ status, myIndex }))?.tone).toBe(tone);
	});

	test("a closed room has the neutral tone", () => {
		expect(resultView(input({ isRoomClosed: true }))?.tone).toBe("neutral");
	});

	test("the score lists the viewer first", () => {
		expect(resultView(input({ myIndex: 1, status: { type: "winner", player: 1 } }))?.score).toEqual(
			[BLAIR, ALEX]
		);
	});

	test("the seats follow the score's order", () => {
		expect(resultView(input({ myIndex: 1 }))?.seats).toEqual([1, 0]);
		expect(resultView(input({ myIndex: null }))?.seats).toEqual([0, 1]);
	});

	test("a spectator's score lists seat 0 first", () => {
		expect(resultView(input({ myIndex: null }))?.score).toEqual([ALEX, BLAIR]);
	});

	test("a seated viewer in an open room can rematch, find a new opponent, or go to the lobby", () => {
		expect(resultView(input())?.actions).toEqual(["rematch", "new-opponent", "lobby"]);
	});

	test("a spectator can only go to the lobby", () => {
		expect(resultView(input({ myIndex: null }))?.actions).toEqual(["lobby"]);
	});

	test.each([
		["a round in play", input({ status: { type: "turn", player: 0 } })],
		["an open waiting room", input({ status: { type: "waiting" } })],
		["scrubbing a finished round", input({ isViewingHistory: true })],
		["a past round", input({ isLive: false })],
		["a closed past round", input({ isLive: false, isRoomClosed: true })],
		["no status", input({ status: undefined })]
	])("%s shows no card", (_, view) => {
		expect(resultView(view)).toBeNull();
	});

	test("a waiting room that closed says nobody joined", () => {
		const view = resultView(
			input({ isRoomClosed: true, status: { type: "waiting", closed: true } })
		);
		expect(view?.headline).toBe("Nobody joined, so the room closed");
	});

	test("a room the opponent abandoned says they left", () => {
		const view = resultView(
			input({ isRoomClosed: true, status: { type: "winner", player: 0, reason: "abandon" } })
		);
		expect(view?.headline).toBe("Blair left the room");
	});

	test("a room the viewer abandoned says they left", () => {
		const view = resultView(
			input({ isRoomClosed: true, status: { type: "winner", player: 1, reason: "abandon" } })
		);
		expect(view?.headline).toBe("You left the room");
	});

	test("a spectator of an abandoned room is told who left", () => {
		const view = resultView(
			input({
				myIndex: null,
				isRoomClosed: true,
				status: { type: "winner", player: 1, reason: "abandon" }
			})
		);
		expect(view?.headline).toBe("Alex left the room");
	});

	test.each([
		["a finished round", { type: "winner", player: 0 }],
		["a round in play", { type: "turn", player: 1 }]
	] as const)("a room closed after %s says only that it is closed", (_, status) => {
		const view = resultView(input({ isRoomClosed: true, status }));
		expect(view?.headline).toBe("This room is closed");
	});

	test("a closed room offers Play again and the lobby, with no reason or rating line", () => {
		const view = resultView(
			input({ isRoomClosed: true, status: { type: "winner", player: 0, reason: "abandon" } })
		);
		expect(view?.actions).toEqual(["play-again", "lobby"]);
		expect(view?.reason).toBeNull();
		expect(view?.rating).toBeNull();
	});
});
