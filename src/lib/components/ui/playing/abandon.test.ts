import { describe, expect, test } from "vitest";
import { abandonMessage } from "./abandon.js";

describe("abandonMessage", () => {
	test("names the round, the opponent, and the rating cost while the round is live", () => {
		expect(abandonMessage({ round: 2, opponentName: "Bob", isRoundLive: true })).toBe(
			"You'll forfeit round 2 to Bob and lose 8 rating points. The room closes."
		);
	});

	test("only says the room closes once the round is over", () => {
		expect(abandonMessage({ round: 2, opponentName: "Bob", isRoundLive: false })).toBe(
			"The room closes."
		);
	});

	test("says no one has joined when the second seat is empty", () => {
		expect(abandonMessage({ round: 1, opponentName: null, isRoundLive: false })).toBe(
			"No one has joined yet. The room closes."
		);
	});
});
