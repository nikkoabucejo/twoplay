import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api.js";
import { chessEngine } from "../../../../../convex/models/games/chess/index.js";
import { positionKey, squareIndex } from "../../../../../convex/models/games/chess/rules.js";
import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
import {
	createRooted,
	deferred,
	historyOf,
	mutationFor,
	resetConvex,
	roomSnapshot,
	setQueryResult
} from "$lib/utils/multiplayer/room/fake-convex.svelte.js";
import { ChessRoom } from "./game.svelte.js";
import type { ChessMove, ChessState, Square } from "./types.js";

vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"));

const initial = chessEngine.createInitialState();

function at(fen: string): ChessState {
	return { kind: "chess", fen, positions: [positionKey(fen)] };
}

/** Each position after the from-to moves, played by alternating seats from `start`. */
function line(start: ChessState, ...moves: string[]): ChessState[] {
	let state = start;
	return moves.map((text, ply) => {
		const move: ChessMove = { kind: "chess", from: text.slice(0, 2), to: text.slice(2) };
		state = chessEngine.applyMove(state, ply % 2, move);
		return state;
	});
}

const PINNED = at("4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1");
const PROMOTING = at("8/1P5k/8/8/8/8/8/K7 w - - 0 1");

let destroy: () => void;

function createRoom(snapshot = roomSnapshot(initial)) {
	setQueryResult(api.models.rooms.index.get, snapshot);
	const rooted = createRooted(() => new ChessRoom(() => "ABCD"));
	destroy = () => {
		rooted.instance.dispose();
		rooted.destroy();
	};
	return rooted.instance;
}

function submittedMoves() {
	return mutationFor(api.models.rooms.index.play).mock.calls.map(([args]) => args.move);
}

async function choose(room: ChessRoom, ...squares: Square[]) {
	for (const square of squares) await room.select(squareIndex(square));
}

function pieceOn(room: ChessRoom, square: Square) {
	return room.board[squareIndex(square)];
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	destroy();
	resetConvex();
	vi.useRealTimers();
});

describe("ChessRoom", () => {
	test("white is to move at the start", () => {
		const room = createRoom();
		expect(room.turn).toBe("w");
		expect(room.isMyTurn).toBe(true);
	});

	test("choosing the knight at the start hints exactly f3 and h3", async () => {
		const room = createRoom();
		await choose(room, "g1");
		expect(room.effectiveSelected).toBe("g1");
		expect([...room.destinations].sort()).toEqual(["f3", "h3"]);
	});

	test("a pinned piece is not selected", async () => {
		const room = createRoom(roomSnapshot(PINNED));
		await choose(room, "e2");
		expect(room.effectiveSelected).toBeNull();
		expect(room.destinations).toEqual([]);
	});

	test("nothing is selected off the viewer's turn", async () => {
		const [e4] = line(initial, "e2e4");
		const room = createRoom(roomSnapshot(e4));
		await choose(room, "g1");
		expect(room.effectiveSelected).toBeNull();
	});

	test("a spectator cannot select", async () => {
		const room = createRoom(roomSnapshot(initial, { myIndex: null }));
		await choose(room, "g1");
		expect(room.effectiveSelected).toBeNull();
	});

	test("choosing a hinted square sends the move and clears the selection", async () => {
		const room = createRoom();
		await choose(room, "g1", "f3");
		const move: ChessMove = { kind: "chess", from: "g1", to: "f3" };
		expect(submittedMoves()).toEqual([move]);
		expect(room.effectiveSelected).toBeNull();
	});

	test("choosing another movable piece selects it instead", async () => {
		const room = createRoom();
		await choose(room, "g1", "e2");
		expect(room.effectiveSelected).toBe("e2");
		expect([...room.destinations].sort()).toEqual(["e3", "e4"]);
	});

	test("choosing a square that is not hinted sends nothing and clears the selection", async () => {
		const room = createRoom();
		await choose(room, "g1", "e5");
		expect(submittedMoves()).toEqual([]);
		expect(room.effectiveSelected).toBeNull();
	});

	test("choosing the selected piece again clears the selection", async () => {
		const room = createRoom();
		await choose(room, "g1", "g1");
		expect(room.effectiveSelected).toBeNull();
	});

	test("a pawn reaching the last rank opens the picker and sends nothing", async () => {
		const room = createRoom(roomSnapshot(PROMOTING));
		await choose(room, "b7", "b8");
		expect(room.pendingPromotion).toEqual({ from: "b7", to: "b8" });
		expect(submittedMoves()).toEqual([]);
	});

	test("picking a piece sends the promotion", async () => {
		const room = createRoom(roomSnapshot(PROMOTING));
		await choose(room, "b7", "b8");
		await room.promote("n");
		const move: ChessMove = { kind: "chess", from: "b7", to: "b8", promotion: "n" };
		expect(submittedMoves()).toEqual([move]);
		expect(room.pendingPromotion).toBeNull();
	});

	test("cancelling the picker sends nothing and leaves the pawn on b7", async () => {
		const room = createRoom(roomSnapshot(PROMOTING));
		await choose(room, "b7", "b8");
		room.cancelPromotion();
		expect(room.pendingPromotion).toBeNull();
		expect(submittedMoves()).toEqual([]);
		expect(pieceOn(room, "b7")).toEqual({ color: "w", type: "p" });
	});

	test("stepping back closes the picker, and picking then sends nothing", async () => {
		const [pushed, answered] = line(at("7k/8/1P6/8/8/8/8/K7 w - - 0 1"), "b6b7", "h8h7");
		const room = createRoom(roomSnapshot(answered));
		setQueryResult(api.models.games.index.history, historyOf([pushed, answered]));
		await choose(room, "b7", "b8");

		room.stepBack();
		expect(room.pendingPromotion).toBeNull();

		await room.promote("q");
		expect(submittedMoves()).toEqual([]);
	});

	test("the round ending closes the picker, and picking then sends nothing", async () => {
		const room = createRoom(roomSnapshot(PROMOTING));
		await choose(room, "b7", "b8");

		setQueryResult(
			api.models.rooms.index.get,
			roomSnapshot(PROMOTING, { game: { endedSeat: 0, reason: "timeout" } })
		);
		expect(room.pendingPromotion).toBeNull();

		await room.promote("q");
		expect(submittedMoves()).toEqual([]);
	});

	test("a move shows on the board while the server has not answered", () => {
		const room = createRoom();
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);

		void room.select(squareIndex("e2"));
		void room.select(squareIndex("e4"));

		expect(pieceOn(room, "e4")).toEqual({ color: "w", type: "p" });
		expect(pieceOn(room, "e2")).toBeNull();
		expect(room.activeSeat).toBe(1);
		expect(room.canSelect(squareIndex("g1"))).toBe(false);
	});

	test("a promotion shows on the board while the server has not answered", async () => {
		const room = createRoom(roomSnapshot(PROMOTING));
		mutationFor(api.models.rooms.index.play).mockReturnValueOnce(deferred().promise);
		await choose(room, "b7", "b8");

		void room.promote("n");

		expect(pieceOn(room, "b8")).toEqual({ color: "w", type: "n" });
		expect(pieceOn(room, "b7")).toBeNull();
	});

	test("the first move's last move is played from the start", () => {
		const [e4] = line(initial, "e2e4");
		const room = createRoom(roomSnapshot(e4));
		setQueryResult(api.models.games.index.history, historyOf([e4]));
		expect(room.lastMove).toEqual({ from: "e2", to: "e4", san: "e4", seat: 0 });
	});

	test("a kingside castle marks e1 and g1", () => {
		const castling = at("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
		const [castled] = line(castling, "e1g1");
		const room = createRoom(roomSnapshot(castled));
		setQueryResult(api.models.games.index.history, historyOf([castling, castled]));
		expect(room.lastMove).toEqual({ from: "e1", to: "g1", san: "O-O", seat: 0 });
	});

	test("a knight capture with check reads Nxe5+", () => {
		const before = at("8/3k4/8/4p3/8/5N2/8/4K3 w - - 0 1");
		const [captured] = line(before, "f3e5");
		const room = createRoom(roomSnapshot(captured));
		setQueryResult(api.models.games.index.history, historyOf([before, captured]));
		expect(room.lastMove?.san).toBe("Nxe5+");
	});

	test("a promotion to a queen with mate reads e8=Q#", () => {
		const before = at("7k/4P1pp/8/8/8/8/8/4K3 w - - 0 1");
		const promoted = chessEngine.applyMove(before, 0, {
			kind: "chess",
			from: "e7",
			to: "e8",
			promotion: "q"
		});
		const room = createRoom(roomSnapshot(promoted));
		setQueryResult(api.models.games.index.history, historyOf([before, promoted]));
		expect(room.lastMove?.san).toBe("e8=Q#");
	});

	test("the starting position has no last move", () => {
		const room = createRoom();
		setQueryResult(api.models.games.index.history, []);
		expect(room.lastMove).toBeNull();
	});

	test("the king in check is marked", () => {
		const [, , checked] = line(initial, "e2e4", "f7f6", "d1h5");
		const room = createRoom(roomSnapshot(checked));
		expect(room.checkSquare).toBe("e8");
	});

	test("no square is marked when nobody is in check", () => {
		const room = createRoom();
		expect(room.checkSquare).toBeNull();
	});

	test("stepping back to a check marks that king", () => {
		const states = line(initial, "e2e4", "e7e5", "f2f4", "d8h4", "g2g3");
		const room = createRoom(roomSnapshot(states[4]));
		setQueryResult(api.models.games.index.history, historyOf(states));
		expect(room.checkSquare).toBeNull();

		room.stepBack();

		expect(room.checkSquare).toBe("e1");
	});

	test("a checkers room loaded as chess has an empty board and no legal moves", () => {
		const room = createRoom(roomSnapshot(checkersEngine.createInitialState()));
		expect(room.wrongGameType).toBe(true);
		expect(room.board).toEqual([]);
		expect(room.legalMoves).toEqual([]);
	});

	test("a rematch clears the selection and the picker", async () => {
		const room = createRoom(roomSnapshot(PROMOTING));
		await choose(room, "b7", "b8");
		await room.rematch();
		expect(room.pendingPromotion).toBeNull();
		expect(room.selected).toBeNull();
	});
});
