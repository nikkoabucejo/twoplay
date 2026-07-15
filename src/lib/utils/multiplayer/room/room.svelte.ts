import { useMutation, useQuery, type UseQueryReturn } from "convex-svelte";
import type { GameMove, GameState, GameType } from "../../../../../convex/models/games/index.js";
import { api } from "../../../../../convex/_generated/api.js";

/**
 * Shared multiplayer-room plumbing: the live Convex subscription, move/rematch/resign/timeout
 * mutations, the round/live/players/clock state, and local move-history scrubbing every game's room
 * class needs. Subclasses (`TictactoeRoom`, `CheckersRoom`) add only their own game-specific derived
 * state (board, legal moves, turn, winner, …) — narrowing `displayState`/`data.game.state` to their own
 * `kind` the way the base class can't — implement `activeSeat` by mapping that state to a generic seat
 * index, and call `submitMove` after validating a move is theirs to make.
 */
export abstract class Room {
	error = $state<string | null>(null);

	#kind: GameType;
	#getCode: () => string;
	#room: UseQueryReturn<typeof api.models.rooms.index.get>;
	#history: UseQueryReturn<typeof api.models.games.index.history>;
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

	/** `getRound` pins the room to a specific past round (e.g. from a `/:round` URL segment) instead of
	 *  always following the live one. Omit it, or have it return undefined, to always track the live round. */
	constructor(
		kind: GameType,
		getCode: () => string,
		getRound: () => number | undefined = () => undefined
	) {
		this.#kind = kind;
		this.#getCode = getCode;
		this.#room = useQuery(api.models.rooms.index.get, () => ({
			code: this.#getCode(),
			round: getRound()
		}));
		this.#history = useQuery(api.models.games.index.history, () => ({
			code: this.#getCode(),
			round: getRound()
		}));
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

		// Auto-claims the timeout as soon as this browser's live countdown reaches zero for the active
		// seat — shared by every game rather than duplicated per `*Room` subclass. A failed claim
		// (see `timeout()`) just means another client resolved the round first, which is fine.
		$effect(() => {
			const seat = this.activeSeat;
			if (seat === null || this.#isClaimingTimeout || this.#liveRemaining[seat] > 0) return;
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

	/** True once the room is found but belongs to a different game type — a room-code collision across games. */
	wrongGameType = $derived.by(() => this.data != null && this.data.type !== this.#kind);

	/** The two seats' player info — name, emoji, and running score — indexed by seat, each game maps
	 *  0/1 to its own domain labels (X/O, player 1/player 2, …) itself; this class only knows about generic seats. */
	players = $derived(this.data?.players ?? [null, null]);

	/** Which seat the viewer occupies, or null when spectating/not yet joined. Both games are two-seat,
	 *  so the query's `number | null` is narrowed here once instead of at every call site. */
	myIndex = $derived((this.data?.myIndex ?? null) as 0 | 1 | null);

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

	/** Which seat is currently burning clock, or null while frozen (not live, waiting for an opponent,
	 *  or the round is over) — each `*Room` subclass maps its own turn/winner state to a seat index. */
	abstract get activeSeat(): 0 | 1 | null;

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
	 *  their own game's `kind` the same way they narrow the live state off `data.game.state`. */
	protected displayState = $derived.by((): GameState | null => {
		if (this.#cursor === null) return this.data?.game.state ?? null;
		return this.#historyMoves[this.#cursor]?.state ?? this.data?.game.state ?? null;
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

	#liveRemaining = $derived.by((): [number, number] => {
		const banked = this.#bankedRemaining;
		if (!banked) return [0, 0];
		const turnedAt = this.#turnedAt;
		const seat = this.activeSeat;
		return banked.map((ms, i) =>
			i === seat && turnedAt !== null ? Math.max(0, ms - (this.now - turnedAt)) : ms
		) as [number, number];
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

	protected async submitMove(move: GameMove): Promise<void> {
		this.error = null;
		try {
			await this.#play({ code: this.#getCode(), move });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}

	/** Starts the room's next round. Either seat can trigger it unilaterally — no request/accept. */
	async rematch(): Promise<void> {
		if (!this.game.isLive) return;

		this.#cursor = null;
		this.error = null;
		try {
			await this.#rematch({ code: this.#getCode() });
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
