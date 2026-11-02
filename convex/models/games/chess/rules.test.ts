// @vitest-environment node
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
	INITIAL_FEN,
	boardOf,
	checkedKing,
	colorOfSeat,
	findMove,
	initialPosition,
	isCheck,
	isCapture,
	isPromotion,
	legalMoves,
	outcome,
	play,
	positionKey,
	seatOfColor,
	squareIndex,
	squareName,
	turnOf,
	type Position,
	type Square
} from "./rules.js";

const FOOLS_MATE = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
const CASTLING = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
const PROMOTING = "8/P6k/8/8/8/8/8/K7 w - - 0 1";

function at(fen: string): Position {
	return { fen, positions: [positionKey(fen)] };
}

/** Plays space-separated from-to moves such as "e2e4 e7e5", failing on an illegal one. */
function after(position: Position, moves: string): Position {
	return moves.split(" ").reduce((current, text) => {
		const next = play(current, { from: text.slice(0, 2), to: text.slice(2, 4) });
		if (next === null) throw new Error(`${text} is illegal`);
		return next;
	}, position);
}

function pieceAt(position: Position, square: Square) {
	return boardOf(position.fen)[squareIndex(square)];
}

describe("chess.js import boundary", () => {
	// Read at run time: a Vite glob is fixed when the test file is transformed, and the transform is cached.
	test("no file but rules.ts imports chess.js", () => {
		const root = fileURLToPath(new URL("../../../../", import.meta.url));
		const importsChessJs = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']chess\.js["']/;
		const importers = globSync(["src/**/*.{ts,svelte}", "convex/**/*.ts"], {
			cwd: root,
			exclude: ["convex/_generated/**"]
		}).filter(
			(path) =>
				path !== "convex/models/games/chess/rules.ts" &&
				importsChessJs.test(readFileSync(`${root}${path}`, "utf8"))
		);
		expect(importers).toEqual([]);
	});
});

describe("colorOfSeat", () => {
	test("seat 0 plays white and seat 1 plays black", () => {
		expect(colorOfSeat(0)).toBe("w");
		expect(colorOfSeat(1)).toBe("b");
	});
});

describe("seatOfColor", () => {
	test("white is seat 0 and black is seat 1", () => {
		expect(seatOfColor("w")).toBe(0);
		expect(seatOfColor("b")).toBe(1);
	});
});

describe("initialPosition", () => {
	test("is the standard start with only its own key in the history", () => {
		expect(initialPosition()).toEqual({
			fen: INITIAL_FEN,
			positions: [positionKey(INITIAL_FEN)]
		});
		expect(INITIAL_FEN).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
	});
});

describe("boardOf", () => {
	const board = boardOf(INITIAL_FEN);

	test("has 64 squares", () => {
		expect(board).toHaveLength(64);
	});

	test("a8 is index 0 and h1 is index 63", () => {
		expect(board[0]).toEqual({ color: "b", type: "r" });
		expect(board[63]).toEqual({ color: "w", type: "r" });
	});

	test("the kings start on e8 and e1", () => {
		expect(board[4]).toEqual({ color: "b", type: "k" });
		expect(board[60]).toEqual({ color: "w", type: "k" });
	});

	test("the middle ranks are empty", () => {
		expect(board.slice(16, 48).every((square) => square === null)).toBe(true);
	});
});

describe("squareName", () => {
	test("counts from a8 to h1", () => {
		expect(squareName(0)).toBe("a8");
		expect(squareName(7)).toBe("h8");
		expect(squareName(36)).toBe("e4");
		expect(squareName(63)).toBe("h1");
	});
});

describe("squareIndex", () => {
	test("is the inverse of squareName on every square", () => {
		const indexes = Array.from({ length: 64 }, (_, index) => index);
		expect(indexes.map((index) => squareIndex(squareName(index)))).toEqual(indexes);
	});
});

describe("turnOf", () => {
	test("white moves first and black answers", () => {
		expect(turnOf(INITIAL_FEN)).toBe("w");
		expect(turnOf(after(initialPosition(), "e2e4").fen)).toBe("b");
	});
});

describe("isCheck", () => {
	test("the side to move is in check after fool's mate", () => {
		expect(isCheck(FOOLS_MATE)).toBe(true);
	});

	test("nobody is in check at the start", () => {
		expect(isCheck(INITIAL_FEN)).toBe(false);
	});
});

describe("checkedKing", () => {
	test("is the square of the king in check", () => {
		expect(checkedKing(FOOLS_MATE)).toBe("e1");
	});

	test("is null when the side to move is not in check", () => {
		expect(checkedKing(INITIAL_FEN)).toBeNull();
	});
});

describe("legalMoves", () => {
	test("white has twenty opening moves", () => {
		expect(legalMoves(INITIAL_FEN)).toHaveLength(20);
	});

	test("lists a promotion once per piece", () => {
		const promotions = legalMoves(PROMOTING).filter((move) => move.from === "a7");
		expect(promotions.map((move) => move.promotion).sort()).toEqual(["b", "n", "q", "r"]);
	});

	test("labels each move in SAN", () => {
		expect(legalMoves(INITIAL_FEN)).toContainEqual({ from: "g1", to: "f3", san: "Nf3" });
	});
});

describe("isCapture", () => {
	test("a move whose SAN marks a take is a capture", () => {
		expect(isCapture({ from: "e4", to: "d5", san: "exd5" })).toBe(true);
	});

	test("a quiet move is not", () => {
		expect(isCapture({ from: "g1", to: "f3", san: "Nf3" })).toBe(false);
	});
});

describe("isPromotion", () => {
	test("a pawn reaching the last rank promotes", () => {
		expect(isPromotion(PROMOTING, "a7", "a8")).toBe(true);
	});

	test("an ordinary pawn move does not", () => {
		expect(isPromotion(INITIAL_FEN, "e2", "e4")).toBe(false);
	});

	test("an illegal move does not", () => {
		expect(isPromotion(PROMOTING, "a7", "b8")).toBe(false);
	});
});

describe("play", () => {
	test("a piece moved the wrong way is not applied", () => {
		expect(play(initialPosition(), { from: "e2", to: "e5" })).toBeNull();
	});

	test("a pinned piece cannot move", () => {
		expect(play(at("4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1"), { from: "e2", to: "c3" })).toBeNull();
	});

	test("a move that ignores check is not applied", () => {
		expect(play(at("4k3/8/8/8/8/8/7P/r3K3 w - - 0 1"), { from: "h2", to: "h3" })).toBeNull();
	});

	test("the opponent's piece cannot be moved", () => {
		expect(play(initialPosition(), { from: "e7", to: "e5" })).toBeNull();
	});

	test("a several-KB square is not applied", () => {
		expect(play(initialPosition(), { from: "e2".repeat(4096), to: "e4" })).toBeNull();
	});

	test("a square off the board is not applied", () => {
		expect(play(initialPosition(), { from: "e2", to: "z9" })).toBeNull();
	});

	test("a malformed square is rejected before the position is read", () => {
		expect(play({ fen: "not a fen", positions: [] }, { from: "z9", to: "e4" })).toBeNull();
	});

	test("a legal move moves the piece and passes the turn", () => {
		const next = after(initialPosition(), "e2e4");
		expect(pieceAt(next, "e4")).toEqual({ color: "w", type: "p" });
		expect(pieceAt(next, "e2")).toBeNull();
		expect(turnOf(next.fen)).toBe("b");
	});

	test("castles kingside", () => {
		const next = after(at(CASTLING), "e1g1");
		expect(pieceAt(next, "g1")).toEqual({ color: "w", type: "k" });
		expect(pieceAt(next, "f1")).toEqual({ color: "w", type: "r" });
	});

	test("castles queenside", () => {
		const next = after(at(CASTLING), "e1c1");
		expect(pieceAt(next, "c1")).toEqual({ color: "w", type: "k" });
		expect(pieceAt(next, "d1")).toEqual({ color: "w", type: "r" });
	});

	test("cannot castle out of check", () => {
		expect(play(at("4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1"), { from: "e1", to: "g1" })).toBeNull();
	});

	test("cannot castle through an attacked square", () => {
		expect(play(at("5rk1/8/8/8/8/8/8/R3K2R w KQ - 0 1"), { from: "e1", to: "g1" })).toBeNull();
	});

	test("cannot castle after the king has moved", () => {
		const returned = after(at(CASTLING), "e1e2 a8b8 e2e1 b8a8");
		expect(play(returned, { from: "e1", to: "g1" })).toBeNull();
	});

	test("captures en passant right after the double step", () => {
		const next = after(initialPosition(), "e2e4 a7a6 e4e5 d7d5 e5d6");
		expect(pieceAt(next, "d6")).toEqual({ color: "w", type: "p" });
		expect(pieceAt(next, "d5")).toBeNull();
	});

	test("cannot capture en passant a move too late", () => {
		const late = after(initialPosition(), "e2e4 a7a6 e4e5 d7d5 h2h3 h7h6");
		expect(play(late, { from: "e5", to: "d6" })).toBeNull();
	});

	test.each(["q", "r", "b", "n"] as const)("promotes to %s", (promotion) => {
		const next = play(at(PROMOTING), { from: "a7", to: "a8", promotion });
		if (next === null) throw new Error("promotion was rejected");
		expect(pieceAt(next, "a8")).toEqual({ color: "w", type: promotion });
		expect(pieceAt(next, "a7")).toBeNull();
	});

	test("a promotion without a piece is not applied", () => {
		expect(play(at(PROMOTING), { from: "a7", to: "a8" })).toBeNull();
	});

	test("a promotion piece on an ordinary move is not applied", () => {
		expect(play(initialPosition(), { from: "e2", to: "e4", promotion: "q" })).toBeNull();
	});

	test("a pawn move resets the repetition history", () => {
		const next = after(initialPosition(), "g1f3 g8f6 f3g1 f6g8 e2e3 e7e6 g1f3 g8f6 f3g1 f6g8");
		expect(next.positions).toHaveLength(5);
		expect(outcome(next)).toBeNull();
	});

	test("a capture resets the repetition history", () => {
		const next = after(initialPosition(), "e2e4 d7d5 g1f3 g8f6 e4d5");
		expect(next.positions).toEqual([positionKey(next.fen)]);
	});

	test("the history holds 101 positions after 100 quiet half-moves", () => {
		const shuffle = Array(25).fill("a2a3 e5e6 a3a2 e6e5").join(" ");
		const next = after(at("8/8/8/4k3/8/8/R7/4K3 w - - 0 1"), shuffle);
		expect(next.positions).toHaveLength(101);
	});
});

describe("outcome", () => {
	test("the start is still in progress", () => {
		expect(outcome(initialPosition())).toBeNull();
	});

	test("fool's mate is checkmate", () => {
		expect(outcome(after(initialPosition(), "f2f3 e7e5 g2g4 d8h4"))).toBe("checkmate");
	});

	test("a side with no move and no check is stalemated", () => {
		expect(outcome(after(at("7k/4Q3/6K1/8/8/8/8/8 w - - 0 1"), "e7f7"))).toBe("stalemate");
	});

	test("king against king is insufficient", () => {
		expect(outcome(after(at("8/8/8/4k3/8/8/4q3/4K3 w - - 0 1"), "e1e2"))).toBe("insufficient");
	});

	test("king and knight against king is insufficient", () => {
		expect(outcome(after(at("8/8/8/4k3/8/8/4q3/4K1N1 w - - 0 1"), "g1e2"))).toBe("insufficient");
	});

	test("king and bishop against king is insufficient", () => {
		expect(outcome(after(at("8/8/8/4k3/8/8/4q3/3BK3 w - - 0 1"), "d1e2"))).toBe("insufficient");
	});

	test("bishops on squares of one color are insufficient", () => {
		expect(outcome(after(at("4kb2/8/8/6n1/8/8/8/2B1K3 w - - 0 1"), "c1g5"))).toBe("insufficient");
	});

	test("bishops on squares of both colors play on", () => {
		expect(outcome(after(at("2b1k3/8/8/6n1/8/8/8/2B1K3 w - - 0 1"), "c1g5"))).toBeNull();
	});

	test("knights out and back twice is threefold repetition", () => {
		const next = after(initialPosition(), "g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8");
		expect(outcome(next)).toBe("repetition");
	});

	test("two occurrences of a position play on", () => {
		expect(outcome(after(initialPosition(), "g1f3 g8f6 f3g1 f6g8"))).toBeNull();
	});

	test("the hundredth quiet half-move draws by the fifty-move rule", () => {
		expect(outcome(after(at("8/8/8/4k3/8/8/R7/4K3 w - - 99 80"), "a2a3"))).toBe("fifty-move");
	});

	test("the ninety-ninth quiet half-move plays on", () => {
		expect(outcome(after(at("8/8/8/4k3/8/8/R7/4K3 w - - 98 80"), "a2a3"))).toBeNull();
	});

	test("checkmate on the hundredth quiet half-move wins", () => {
		expect(outcome(after(at("7k/8/6K1/8/8/8/8/R7 w - - 99 80"), "a1a8"))).toBe("checkmate");
	});
});

describe("positionKey", () => {
	test("is the placement, side to move, castling rights, and en passant square", () => {
		const fen = after(initialPosition(), "e2e4 a7a6 e4e5 d7d5").fen;
		expect(positionKey(fen)).toBe("rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6");
	});

	test("drops an en passant square no pawn can capture on", () => {
		expect(positionKey("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")).toBe(
			"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -"
		);
	});
});

describe("findMove", () => {
	test("finds a knight move", () => {
		const next = after(initialPosition(), "g1f3");
		expect(findMove(INITIAL_FEN, next.fen)).toEqual({ from: "g1", to: "f3", san: "Nf3" });
	});

	test("finds a kingside castle", () => {
		const next = after(at(CASTLING), "e1g1");
		expect(findMove(CASTLING, next.fen)).toEqual({ from: "e1", to: "g1", san: "O-O" });
	});

	test("finds an en passant capture", () => {
		const before = after(initialPosition(), "e2e4 a7a6 e4e5 d7d5");
		const next = after(before, "e5d6");
		expect(findMove(before.fen, next.fen)).toEqual({ from: "e5", to: "d6", san: "exd6" });
	});

	test("finds a promotion with mate", () => {
		const fen = "7k/4P1pp/8/8/8/8/8/4K3 w - - 0 1";
		const next = play(at(fen), { from: "e7", to: "e8", promotion: "q" });
		if (next === null) throw new Error("promotion was rejected");
		expect(findMove(fen, next.fen)).toEqual({
			from: "e7",
			to: "e8",
			promotion: "q",
			san: "e8=Q#"
		});
	});

	test("finds a capture with check", () => {
		const fen = "8/3k4/8/4p3/8/5N2/8/4K3 w - - 0 1";
		const next = after(at(fen), "f3e5");
		expect(findMove(fen, next.fen)).toEqual({ from: "f3", to: "e5", san: "Nxe5+" });
	});

	test("is null when no single move links the two positions", () => {
		expect(findMove(INITIAL_FEN, after(initialPosition(), "e2e4 e7e5").fen)).toBeNull();
	});
});
