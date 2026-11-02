import { useMutation, useQuery, type UseQueryReturn } from "convex-svelte";
import type { GameMove, GameState, GameType } from "../../../../../convex/models/games/index.js";
import { api } from "../../../../../convex/_generated/api.js";
import type { GameHistoryEntry } from "../../../../../convex/models/rooms/index.js";

/** A game's pure engine, narrowed to its own `kind` by each subclass. `Room` uses it to predict the
 *  viewer's own moves and to read whose turn a state is. */
export type ClientEngine = {
	/** Throws like the server's engine does for an illegal move. */
	applyMove(state: GameState, seat: 0 | 1, move: GameMove): GameState;
	status(state: GameState): { turnIndex: number; winnerIndex: number | null; isOver: boolean };
};

/** A round's result for the viewer, from their room history. */
export type RoomRound = Pick<GameHistoryEntry, "round" | "result" | "mmr">;

/** The URL of a room, or of one of its rounds. */
export function roomPath(type: GameType, code: string, round?: number): `/${GameType}/${string}` {
	return round === undefined ? `/${type}/${code}` : `/${type}/${code}/${round}`;
}

/** One of the viewer's moves, shown before the server has confirmed it. */
type PendingMove = {
	id: number;
	round: number;
	seat: 0 | 1;
	move: GameMove;
	predicted: GameState;
	queuedAt: number;
	/** The clocks at `queuedAt`, set when this move passes the turn. */
	handoff: { frozen: [number, number] } | null;
};

/** Compares boards only: every pending move starts from the server's state, so the board settles the
 *  rest. Checkers squares are compared by value, so their field order doesn't matter. A chess FEN
 *  carries the move counters, so a repeated chess board still tells its positions apart. */
function isSameState(a: GameState, b: GameState): boolean {
	switch (a.kind) {
		case "tictactoe":
			return b.kind === "tictactoe" && JSON.stringify(a.boards) === JSON.stringify(b.boards);
		case "checkers": {
			const squaresOf = (board: typeof a.board) =>
				JSON.stringify(board.map((square) => square && [square.color, square.king]));
			return b.kind === "checkers" && squaresOf(a.board) === squaresOf(b.board);
		}
		case "chess":
			return b.kind === "chess" && a.fen === b.fen;
	}
}

/**
 * Shared multiplayer-room plumbing: the live Convex subscription, move/rematch/resign/timeout
 * mutations, the round/live/players/clock state, the viewer's pending (predicted) moves, and local
 * move-history scrubbing every game's room class needs. Subclasses (`TictactoeRoom`, `CheckersRoom`)
 * pass their `ClientEngine`, add only their own game-specific derived state (board, legal moves,
 * turn, winner, …) — narrowing `displayState` to their own `kind` the way the base class can't — and
 * call `submitMove` after validating a move is theirs to make.
 */
export abstract class Room {
	error = $state<string | null>(null);
	/** The latest move the server rejected. A new object per rejection, for the toast and the shake. */
	rejection = $state.raw<{ id: number; message: string } | null>(null);

	#kind: GameType;
	#engine: ClientEngine;
	#getCode: () => string;
	#room: UseQueryReturn<typeof api.models.rooms.index.get>;
	#history: UseQueryReturn<typeof api.models.games.index.history>;
	#roomHistory: UseQueryReturn<typeof api.models.rooms.index.history>;
	#play = useMutation(api.models.rooms.index.play);
	#rematch = useMutation(api.models.rooms.index.rematch);
	#resign = useMutation(api.models.games.index.resign);
	#trashtalk = useMutation(api.models.players.index.trashtalk);
	#timeout = useMutation(api.models.games.index.timeout);
	#abandonRoom = useMutation(api.models.rooms.index.abandon);
	#heartbeat = useMutation(api.models.players.index.heartbeat);

	/** How long an opponent's seat can go without a heartbeat before this browser shows them as
	 *  disconnected. Purely a display threshold — the server's own idle sweep is what actually
	 *  forfeits an abandoned room, on a longer timer. */
	static #DISCONNECTED_AFTER_MS = 30_000;
	static #HEARTBEAT_INTERVAL_MS = 15_000;

	/** Ticks once a second so `now`-derived clock displays update without a server round-trip. */
	#now = $state(Date.now());
	#tick: ReturnType<typeof setInterval>;
	#heartbeatTick: ReturnType<typeof setInterval>;

	#isClaimingTimeout = $state(false);
	#frozenRemaining = $state<[number, number] | null>(null);

	/** Local scrubber position into this round's move history; null means "live" (always the latest state).
	 *  Purely a per-browser viewing cursor — never sent to the server and never affects the real game. */
	#cursor = $state<number | null>(null);

	/** The viewer's moves sent but not yet confirmed, oldest first. */
	#pending = $state.raw<PendingMove[]>([]);
	#nextPendingId = 0;

	/** `getRound` pins the room to a specific past round (e.g. from a `/:round` URL segment) instead of
	 *  always following the live one. Omit it, or have it return undefined, to always track the live round. */
	constructor(
		kind: GameType,
		engine: ClientEngine,
		getCode: () => string,
		getRound: () => number | undefined = () => undefined
	) {
		this.#kind = kind;
		this.#engine = engine;
		this.#getCode = getCode;
		this.#room = useQuery(api.models.rooms.index.get, () => ({
			code: this.#getCode(),
			round: getRound()
		}));
		this.#history = useQuery(api.models.games.index.history, () => ({
			code: this.#getCode(),
			round: getRound()
		}));
		this.#roomHistory = useQuery(api.models.rooms.index.history, () =>
			this.myIndex === null ? "skip" : {}
		);
		this.#tick = setInterval(() => (this.#now = Date.now()), 1000);

		// Records that this browser is still here, for the opponent's "disconnected" indicator and the
		// server's idle-room sweep. Fired once immediately rather than waiting out the first interval.
		const sendHeartbeat = () => void this.#heartbeat({ code: this.#getCode() }).catch(() => {});
		sendHeartbeat();
		this.#heartbeatTick = setInterval(sendHeartbeat, Room.#HEARTBEAT_INTERVAL_MS);

		$effect(() => {
			if (this.isClockDisplayFrozen) {
				if (this.#frozenRemaining === null) this.#frozenRemaining = this.#liveRemaining;
				return;
			}
			this.#frozenRemaining = null;
		});

		$effect(() => {
			// A round reset clears history server-side; drop any stale cursor back to live.
			if (this.#historyMoves.length === 0) this.#cursor = null;
		});

		$effect(() => {
			// Confirmed moves and moves from an earlier round no longer fold into the live state.
			const unsettled = this.#roundPending.slice(this.#confirmedCount);
			if (unsettled.length < this.#pending.length) this.#pending = unsettled;
		});

		// Auto-claims the timeout as soon as this browser's countdown of the server's clock reaches zero
		// for the server's active seat — never a predicted one. Shared by every game rather than
		// duplicated per `*Room` subclass. A failed claim (see `timeout()`) just means another client
		// resolved the round first, which is fine.
		$effect(() => {
			const seat = this.#confirmedActiveSeat;
			if (seat === null || this.#isClaimingTimeout || this.#serverRemaining[seat] > 0) return;
			this.#isClaimingTimeout = true;
			this.timeout().finally(() => (this.#isClaimingTimeout = false));
		});
	}

	/** Call on component teardown to stop the clock tick and heartbeat. */
	dispose(): void {
		clearInterval(this.#tick);
		clearInterval(this.#heartbeatTick);
	}

	get isLoading() {
		return this.#room.isLoading;
	}

	get data() {
		return this.#room.data;
	}

	/** The room query's failure, or null. */
	get loadError(): Error | null {
		return this.#room.error ?? null;
	}

	/** True once the room is found but belongs to a different game type — a room-code collision across games. */
	wrongGameType = $derived.by(() => this.data != null && this.data.type !== this.#kind);

	/** The two seats' player info — name, emoji, and running score — indexed by seat, each game maps
	 *  0/1 to its own domain labels (X/O, player 1/player 2, …) itself; this class only knows about generic seats. */
	players = $derived(this.data?.players ?? [null, null]);

	/** Which seat the viewer occupies, or null when spectating/not yet joined. Both games are two-seat,
	 *  so the query's `number | null` is narrowed here once instead of at every call site. */
	myIndex = $derived((this.data?.myIndex ?? null) as 0 | 1 | null);

	/** True while the room is short a seat — the host is waiting for someone to join. Every `*Room`
	 *  subclass folds this into its own move-gating (`canPlay`/`canMove`), since a lone host otherwise
	 *  has nothing stopping them from playing both sides of an empty board. */
	isWaitingForOpponent = $derived(this.players.some((seat) => seat === null));

	/** True while the live round waits on the viewer's seat. Follows the live state, including pending
	 *  moves, so scrubbing history doesn't change it. */
	isMyTurn = $derived.by(
		() => this.myIndex !== null && !this.isWaitingForOpponent && this.activeSeat === this.myIndex
	);

	/** `isMyTurn` as the server last confirmed it, ignoring pending moves. */
	isMyTurnConfirmed = $derived.by(
		() =>
			this.myIndex !== null &&
			!this.isWaitingForOpponent &&
			this.#confirmedActiveSeat === this.myIndex
	);

	/** True once the room has closed for good — a player abandoned it, it never filled, or every seat
	 *  went idle. Closed rooms are permanently un-joinable; only Rematch/Play are gated on this, since
	 *  the room stays viewable for history. */
	isRoomClosed = $derived(this.data?.status === "closed");

	/** True while the seat opposite the viewer has gone quiet for longer than the display threshold —
	 *  purely a UI hint; the server's own idle sweep (on a longer timer) is what actually forfeits the
	 *  room. Null while spectating (no "opponent" to speak of) or before that seat has ever heartbeated. */
	opponentDisconnected = $derived.by(() => {
		const seat = this.myIndex === null ? null : this.myIndex === 0 ? 1 : 0;
		const seenAt = seat === null ? null : (this.players[seat]?.seenAt ?? null);
		if (seenAt === null) return false;
		return this.now - seenAt > Room.#DISCONNECTED_AFTER_MS;
	});

	/** The round currently displayed, whether it's still live, and how it ended, if it has. */
	game = $derived.by(() => ({
		/** The round currently displayed — for round-by-round navigation. */
		round: this.data?.game.round ?? 1,
		/** The room's most recent round — for round-by-round navigation. */
		latestRound: this.data?.game.latestRound ?? this.data?.game.round ?? 1,
		/** False when `getRound` has pinned this to a past round rather than the one still being played. */
		isLive: this.data?.game.isLive ?? true,
		/** The seat whose round has ended against them — a real clock timeout, a resignation, or an
		 *  abandonment — or null. */
		endedSeat: (this.data?.game.endedSeat ?? null) as 0 | 1 | null,
		/** Why `endedSeat`'s round ended, or null. Distinct causes so the client doesn't mislabel one
		 *  as another. */
		reason: this.data?.game.reason ?? null
	}));

	/** Banked remaining clock per seat, in ms, as of `#turnedAt` — frozen until the next server
	 *  push, not ticking. `clock.remaining` below is the live value to actually display. */
	#bankedRemaining = $derived((this.data?.clock.remaining ?? null) as [number, number] | null);
	/** Epoch ms when the active seat's countdown began, or null while frozen (waiting for both seats,
	 *  or a round with no first move yet). */
	#turnedAt = $derived(this.data?.clock.turnedAt ?? null);

	#serverState = $derived(this.data?.game.state ?? null);

	#roundPending = $derived(this.#pending.filter((entry) => entry.round === this.game.round));

	/** How many leading pending moves the server state already reflects. */
	#confirmedCount = $derived.by(() => {
		const server = this.#serverState;
		if (server === null) return 0;
		return this.#roundPending.findLastIndex((entry) => isSameState(entry.predicted, server)) + 1;
	});

	/** The server state with the unconfirmed pending moves applied, the state before the last of them,
	 *  and the moves that applied. A move that no longer applies stops the fold, since every later move
	 *  was predicted on top of it. */
	#fold = $derived.by(() => {
		let state = this.#serverState;
		let previous: GameState | null = null;
		const applied: PendingMove[] = [];
		if (state === null || !this.game.isLive) return { state, previous, applied };
		for (const entry of this.#roundPending.slice(this.#confirmedCount)) {
			const next = this.#predict(state, entry.seat, entry.move);
			if (next === null) break;
			previous = state;
			state = next;
			applied.push(entry);
		}
		return { state, previous, applied };
	});

	#liveState = $derived(this.#fold.state);

	/** The server state with the viewer's pending moves applied, whatever the scrub cursor shows. */
	protected get liveState(): GameState | null {
		return this.#liveState;
	}

	/** The state after `move`, or null when the engine rejects it or it changes nothing. */
	#predict(state: GameState, seat: 0 | 1, move: GameMove): GameState | null {
		try {
			const next = this.#engine.applyMove(state, seat, move);
			return next === state ? null : next;
		} catch {
			return null;
		}
	}

	#seatOf(state: GameState | null): 0 | 1 | null {
		if (state === null || state.kind !== this.#kind) return null;
		if (!this.game.isLive || this.game.endedSeat !== null) return null;
		const { turnIndex, isOver } = this.#engine.status(state);
		return isOver ? null : (turnIndex as 0 | 1);
	}

	/** Which seat is currently burning clock, or null while frozen (not live, or the round is over).
	 *  Follows pending moves. */
	activeSeat = $derived(this.#seatOf(this.#liveState));

	#confirmedActiveSeat = $derived(this.#seatOf(this.#serverState));

	/** Whose turn it is and who won in the live state, including pending moves and ignoring the scrub
	 *  cursor. Null while loading or for another game's state. */
	liveOutcome = $derived.by(() => {
		const state = this.#liveState;
		if (state === null || state.kind !== this.#kind) return null;
		const { turnIndex, winnerIndex, isOver } = this.#engine.status(state);
		return { turnIndex, winnerIndex, isOver };
	});

	/** The viewer's rounds in this room, newest first. Empty for a spectator. */
	rounds = $derived.by((): RoomRound[] => {
		const entry = this.#roomHistory.data?.find((room) => room.code === this.data?.code);
		return (entry?.games ?? []).map(({ round, result, mmr }) => ({ round, result, mmr }));
	});

	/** Frozen (not ticking) while reviewing history by default — a subclass can override for its own
	 *  additional freeze conditions, but every game freezes the clock display while scrubbing. */
	protected get isClockDisplayFrozen(): boolean {
		return this.isViewingHistory;
	}

	get #historyMoves() {
		return this.#history.data ?? [];
	}

	/** Index of the latest played move this round, or -1 before any move has been made. */
	#latestIndex = $derived(this.#historyMoves.length - 1);

	/** True while this browser is scrubbed away from the live position — purely local, doesn't affect the room. */
	isViewingHistory = $derived(this.#cursor !== null);

	/** 1-based position currently shown, for a "move X of Y" indicator. */
	viewedMoveNumber = $derived((this.#cursor ?? this.#latestIndex) + 1);
	historyLength = $derived(this.#historyMoves.length);

	/** The live game state, or the historical snapshot at the scrub cursor. Subclasses narrow this to
	 *  their own game's `kind`. */
	protected displayState = $derived.by((): GameState | null => {
		if (this.#cursor === null) return this.#liveState;
		return this.#historyMoves[this.#cursor]?.state ?? this.#serverState;
	});

	/** The position before the shown one, for the last-move highlight: the state a pending move was
	 *  played on, the history entry before the shown one, or null before the first move. */
	protected previousDisplayState = $derived.by((): GameState | null => {
		const moves = this.#historyMoves;
		if (this.#cursor !== null) return moves[this.#cursor - 1]?.state ?? null;
		if (this.#fold.previous !== null) return this.#fold.previous;
		const shown = this.#liveState;
		if (shown === null) return null;
		// History can arrive a push behind the room, so the shown state may not be in it yet.
		const at = moves.findLastIndex((entry) => isSameState(entry.state, shown));
		return (at === -1 ? moves.at(-1) : moves[at - 1])?.state ?? null;
	});

	/** Step one move back in this round's history. A no-op past the first move. Local only. */
	stepBack(): void {
		if (this.#historyMoves.length === 0) return;
		const current = this.#cursor ?? this.#latestIndex;
		this.#cursor = Math.max(0, current - 1);
	}

	/** Step one move toward the present. Reaching the latest move returns to the live position. Local only. */
	stepForward(): void {
		if (this.#cursor === null) return;
		this.#cursor = this.#cursor + 1 >= this.#latestIndex ? null : this.#cursor + 1;
	}

	/** Jump to the live position. Local only. */
	jumpToLatest(): void {
		this.#cursor = null;
	}

	/** Jump to the first move of this round. Local only. */
	jumpToFirst(): void {
		if (this.#historyMoves.length === 0) return;
		this.#cursor = 0;
	}

	/** The server's clocks as of `now`, counting down the server's active seat. */
	#remainingAt(now: number): [number, number] {
		const banked = this.#bankedRemaining;
		if (!banked) return [0, 0];
		const turnedAt = this.#turnedAt;
		const seat = this.#confirmedActiveSeat;
		return banked.map((ms, i) =>
			i === seat && turnedAt !== null ? Math.max(0, ms - (now - turnedAt)) : ms
		) as [number, number];
	}

	#serverRemaining = $derived(this.#remainingAt(this.now));

	/** The server's clocks, or, while a pending move passes the turn, the viewer's clock stopped at
	 *  that move and the opponent's counting down from it. */
	#liveRemaining = $derived.by((): [number, number] => {
		for (const { seat, queuedAt, handoff } of this.#fold.applied) {
			if (handoff === null) continue;
			const elapsed = Math.max(0, this.now - queuedAt);
			return handoff.frozen.map((ms, i) => (i === seat ? ms : Math.max(0, ms - elapsed))) as [
				number,
				number
			];
		}
		return this.#serverRemaining;
	});

	/** Live, per-seat remaining time and which seat is burning it — ticking down, or a frozen
	 *  snapshot while the viewer is reviewing history. */
	clock = $derived.by(() => ({
		remaining: this.#frozenRemaining ?? this.#liveRemaining,
		activeSeat: this.isClockDisplayFrozen ? null : this.activeSeat
	}));

	/** Updates once a second — read this instead of `Date.now()` so clock displays stay reactive. */
	get now() {
		return this.#now;
	}

	protected getCode(): string {
		return this.#getCode();
	}

	/** Adds the viewer's move to `#pending` when the engine can predict it, returning its id. */
	#queue(move: GameMove): number | null {
		const live = this.#liveState;
		const seat = this.myIndex;
		if (live === null || seat === null || !this.game.isLive) return null;
		const predicted = this.#predict(live, seat, move);
		if (predicted === null) return null;

		const id = this.#nextPendingId++;
		const queuedAt = Date.now();
		const nextSeat = this.#seatOf(predicted);
		const passesTurn = nextSeat !== null && nextSeat !== seat;
		this.#pending = [
			...this.#pending,
			{
				id,
				round: this.game.round,
				seat,
				move,
				predicted,
				queuedAt,
				handoff: passesTurn ? { frozen: this.#remainingAt(queuedAt) } : null
			}
		];
		return id;
	}

	/** Shows the move as pending at once when the engine can predict it, then sends it. A rejected
	 *  pending move rolls back with every move queued after it and sets `rejection`; a move that
	 *  couldn't be predicted reports its failure through `error`. */
	protected async submitMove(move: GameMove): Promise<void> {
		this.error = null;
		const id = this.#queue(move);
		try {
			await this.#play({ code: this.#getCode(), move });
			if (id !== null) this.#pending = this.#pending.filter((entry) => entry.id !== id);
		} catch (err) {
			if (id === null) {
				this.error = err instanceof Error ? err.message : "Something went wrong";
				return;
			}
			const index = this.#pending.findIndex((entry) => entry.id === id);
			if (index === -1) return;
			this.#pending = this.#pending.slice(0, index);
			this.rejection = { id, message: "Move not accepted" };
		}
	}

	/** Starts the room's next round. Either seat can trigger it unilaterally — no request/accept. */
	async rematch(): Promise<void> {
		if (!this.game.isLive) return;

		this.#cursor = null;
		this.#pending = [];
		this.error = null;
		try {
			await this.#rematch({ code: this.#getCode(), round: this.game.round });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}

	/** Forfeits the round in progress in favor of the opponent. */
	async resign(): Promise<void> {
		if (!this.game.isLive) return;

		this.error = null;
		try {
			await this.#resign({ code: this.#getCode() });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}

	/** Abandons the room entirely — distinct from `resign`, which only forfeits the current round.
	 *  Forfeits the match to the opponent and closes the room for good. */
	async abandon(): Promise<void> {
		this.error = null;
		try {
			await this.#abandonRoom({ code: this.#getCode() });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}

	async trashtalk(emoji: string): Promise<void> {
		this.error = null;
		try {
			await this.#trashtalk({ code: this.#getCode(), emoji });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}

	/** Called automatically once this client's local clock display hits zero. Errors are swallowed —
	 *  a failed claim just means another client's move or timeout already resolved the round first,
	 *  which is an expected, benign race rather than something to surface to the viewer. */
	async timeout(): Promise<void> {
		try {
			await this.#timeout({ code: this.#getCode() });
		} catch {
			// Benign race — ignore.
		}
	}
}
