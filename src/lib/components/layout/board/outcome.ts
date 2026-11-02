import type { BoardStatus } from "./board.svelte";

export type ResultPlayer = { name: string; score: number };

export type ResultAction = "rematch" | "new-opponent" | "play-again" | "lobby";

export type ResultInput = {
	/** The live status from `roomStatus`. */
	status: BoardStatus | undefined;
	myIndex: 0 | 1 | null;
	players: [ResultPlayer, ResultPlayer];
	isLive: boolean;
	isViewingHistory: boolean;
	isRoomClosed: boolean;
	/** The viewer's settled rating change for this round, or null until it settles. */
	mmr: number | null;
};

/** "pending" keeps the pill's box, empty, while the change hasn't settled. */
export type ResultRating = {
	/** The pill's text: "+8", "−8", "±0", or empty. */
	delta: string;
	/** The spoken line: "+8 rating", "-8 rating", "Rating unchanged", or empty. */
	text: string;
	tone: "gain" | "loss" | "even" | "pending";
};

export type ResultView = {
	headline: string;
	/** The viewer's side of it. A spectator's win and a closed room are neutral. */
	tone: "win" | "loss" | "draw" | "neutral";
	reason: string | null;
	/** Null hides the pill: spectators and closed rooms. */
	rating: ResultRating | null;
	/** The viewer's seat first, or seat 0 for a spectator. */
	score: [ResultPlayer, ResultPlayer];
	/** The seat of each `score` entry. */
	seats: [0 | 1, 0 | 1];
	actions: ResultAction[];
};

function closedReason(status: BoardStatus | undefined, myIndex: 0 | 1 | null, names: string[]) {
	if (status?.type === "waiting") return "Nobody joined, so the room closed";
	if (status?.type === "winner" && status.reason === "abandon") {
		const leaver = status.player === 0 ? 1 : 0;
		return leaver === myIndex ? "You left the room" : `${names[leaver]} left the room`;
	}
	return "This room is closed";
}

function endReason(status: BoardStatus, myIndex: 0 | 1 | null, names: string[]) {
	if (status.type !== "winner" || status.reason === undefined) return null;
	const loser = status.player === 0 ? 1 : 0;
	const isMine = loser === myIndex;
	switch (status.reason) {
		case "timeout":
			return isMine ? "Out of time" : `${names[loser]} ran out of time`;
		case "resign":
			return isMine ? "You resigned" : `${names[loser]} resigned`;
		case "abandon":
			return isMine ? "You left" : `${names[loser]} left`;
	}
}

function ratingLine(status: BoardStatus, mmr: number | null): ResultRating {
	if (status.type === "draw" || mmr === 0)
		return { delta: "±0", text: "Rating unchanged", tone: "even" };
	if (mmr === null) return { delta: "", text: "", tone: "pending" };
	return mmr > 0
		? { delta: `+${mmr}`, text: `+${mmr} rating`, tone: "gain" }
		: { delta: `−${-mmr}`, text: `${mmr} rating`, tone: "loss" };
}

/** The card shown over the board when the live round ends or the room closes, or null for no card. */
export function resultView({
	status,
	myIndex,
	players,
	isLive,
	isViewingHistory,
	isRoomClosed,
	mmr
}: ResultInput): ResultView | null {
	if (!isLive || isViewingHistory) return null;
	const names = players.map((player) => player.name);
	const score: [ResultPlayer, ResultPlayer] =
		myIndex === 1 ? [players[1], players[0]] : [players[0], players[1]];
	const seats: [0 | 1, 0 | 1] = myIndex === 1 ? [1, 0] : [0, 1];

	if (isRoomClosed) {
		return {
			headline: closedReason(status, myIndex, names),
			tone: "neutral",
			reason: null,
			rating: null,
			score,
			seats,
			actions: ["play-again", "lobby"]
		};
	}
	if (status?.type !== "winner" && status?.type !== "draw") return null;

	const tone: ResultView["tone"] =
		status.type === "draw"
			? "draw"
			: myIndex === null
				? "neutral"
				: status.player === myIndex
					? "win"
					: "loss";
	const headline =
		status.type === "draw"
			? "Draw"
			: tone === "neutral"
				? `${names[status.player]} won`
				: tone === "win"
					? "You won"
					: "You lost";
	return {
		headline,
		tone,
		reason: endReason(status, myIndex, names),
		rating: myIndex === null ? null : ratingLine(status, mmr),
		score,
		seats,
		actions: myIndex === null ? ["lobby"] : ["rematch", "new-opponent", "lobby"]
	};
}

/** The viewer's own result for the mood, or null when there is none or it isn't theirs. */
export function moodOutcome(
	result: ResultView | null
): Exclude<ResultView["tone"], "neutral"> | null {
	return result === null || result.tone === "neutral" ? null : result.tone;
}
