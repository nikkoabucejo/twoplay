import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { userByExternalId } from "./users.js";

type Cell = "X" | "O" | null;

const BOARD_COUNT = 9;
const CELLS_PER_BOARD = 9;
const CODE_LENGTH = 6;
// No 0/O/1/I/L — avoids ambiguous shared-code typos.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const WINNING_LINES: readonly (readonly [number, number, number])[] = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6]
];

function emptyBoards(): Cell[][] {
	return Array.from({ length: BOARD_COUNT }, () => Array<Cell>(CELLS_PER_BOARD).fill(null));
}

function winnerOf(board: Cell[]): Cell {
	for (const [a, b, c] of WINNING_LINES) {
		if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) return board[a];
	}
	return null;
}

function isBoardFinished(board: Cell[]): boolean {
	return winnerOf(board) !== null || board.every((cell) => cell !== null);
}

function hasOtherPlayableBoard(boards: Cell[][], excludeIndex: number): boolean {
	return boards.some((b, i) => i !== excludeIndex && !isBoardFinished(b));
}

async function requireUser(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error("Sign in to play");

	const user = await userByExternalId(ctx, identity.subject);
	if (!user) throw new Error("Sign in to play");

	return user;
}

async function getRoomByCode(ctx: QueryCtx | MutationCtx, code: string) {
	return await ctx.db
		.query("rooms")
		.withIndex("byCode", (q) => q.eq("code", code))
		.unique();
}

async function generateRoomCode(ctx: MutationCtx): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		let code = "";
		for (let i = 0; i < CODE_LENGTH; i++) {
			code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
		}
		if (!(await getRoomByCode(ctx, code))) return code;
	}
	throw new Error("Could not generate a unique room code, please try again");
}

export const create = mutation({
	args: {},
	async handler(ctx) {
		const user = await requireUser(ctx);
		const code = await generateRoomCode(ctx);
		await ctx.db.insert("rooms", { code, playerXId: user._id, boards: emptyBoards() });
		return code;
	}
});

export const join = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		if (room.playerXId === user._id || room.playerOId === user._id) return;
		if (room.playerOId) throw new Error("Room is full");

		await ctx.db.patch(room._id, { playerOId: user._id });
	}
});

export const get = query({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const room = await getRoomByCode(ctx, code);
		if (!room) return null;

		const identity = await ctx.auth.getUserIdentity();
		const viewer = identity ? await userByExternalId(ctx, identity.subject) : null;

		const [playerX, playerO] = await Promise.all([
			ctx.db.get(room.playerXId),
			room.playerOId ? ctx.db.get(room.playerOId) : null
		]);

		const mySymbol: Cell = viewer
			? viewer._id === room.playerXId
				? "X"
				: room.playerOId && viewer._id === room.playerOId
					? "O"
					: null
			: null;

		return {
			code: room.code,
			boards: room.boards,
			playerX: playerX ? { name: playerX.name } : null,
			playerO: playerO ? { name: playerO.name } : null,
			mySymbol,
			myLastBoard: mySymbol ? (room.lastBoardBySymbol?.[mySymbol] ?? null) : null
		};
	}
});

export const play = mutation({
	args: { code: v.string(), boardIndex: v.number(), cellIndex: v.number() },
	async handler(ctx, { code, boardIndex, cellIndex }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");

		const symbol: Cell =
			user._id === room.playerXId ? "X" : user._id === room.playerOId ? "O" : null;
		if (!symbol) throw new Error("You are not a player in this room");

		const board = room.boards[boardIndex];
		if (!board || isBoardFinished(board) || board[cellIndex] !== null) return;

		const totalFilled = room.boards.reduce(
			(sum, b) => sum + b.filter((c) => c !== null).length,
			0
		);
		const turn: Cell = totalFilled % 2 === 0 ? "X" : "O";
		if (symbol !== turn) throw new Error("Not your turn");

		const lastBoardBySymbol = room.lastBoardBySymbol ?? { X: null, O: null };
		if (
			lastBoardBySymbol[symbol] === boardIndex &&
			hasOtherPlayableBoard(room.boards, boardIndex)
		) {
			throw new Error("You can't play the board you played last turn");
		}

		const boards = room.boards.map((b, i) =>
			i === boardIndex ? b.map((c, j) => (j === cellIndex ? symbol : c)) : b
		);
		await ctx.db.patch(room._id, {
			boards,
			lastBoardBySymbol: { ...lastBoardBySymbol, [symbol]: boardIndex }
		});
	}
});

export const reset = mutation({
	args: { code: v.string() },
	async handler(ctx, { code }) {
		const user = await requireUser(ctx);
		const room = await getRoomByCode(ctx, code);
		if (!room) throw new Error("Room not found");
		if (user._id !== room.playerXId && user._id !== room.playerOId) {
			throw new Error("You are not a player in this room");
		}

		await ctx.db.patch(room._id, {
			boards: emptyBoards(),
			lastBoardBySymbol: { X: null, O: null }
		});
	}
});
