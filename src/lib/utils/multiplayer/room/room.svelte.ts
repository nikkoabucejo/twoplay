import { useMutation, useQuery, type UseQueryReturn } from "convex-svelte";
import type { GameMove, GameType } from "../../../../../convex/models/games/index.js";
import { api } from "../../../../../convex/_generated/api.js";

/**
 * Shared multiplayer-room plumbing: the live Convex subscription, move/rematch/resign/timeout
 * mutations, and the round/live/players/clock state every game's room class needs. Subclasses
 * (`TictactoeRoom`, `CheckersRoom`) add only their own game-specific derived state (board, legal
 * moves, turn, winner, …), implement `activeSeat` by mapping that state to a generic seat index, and
 * call `submitMove` after validating a move is theirs to make.
 */
export abstract class Room {
	error = $state<string | null>(null);

	#kind: GameType;
	#getCode: () => string;
	#room: UseQueryReturn<typeof api.models.rooms.index.get>;
	#play = useMutation(api.models.rooms.index.play);
	#rematch = useMutation(api.models.rooms.index.rematch);
	#resign = useMutation(api.models.games.index.resign);
	#trashtalk = useMutation(api.models.players.index.trashtalk);
	#timeout = useMutation(api.models.games.index.timeout);

	/** Ticks once a second so `now`-derived clock displays update without a server round-trip. */
	#now = $state(Date.now());
	#tick: ReturnType<typeof setInterval>;

	#isClaimingTimeout = $state(false);
	#frozenRemaining = $state<[number, number] | null>(null);

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
		this.#tick = setInterval(() => (this.#now = Date.now()), 1000);

		$effect(() => {
			if (this.isClockDisplayFrozen) {
				if (this.#frozenRemaining === null) this.#frozenRemaining = this.#liveRemaining;
				return;
			}
			this.#frozenRemaining = null;
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

	/** Call on component teardown to stop the clock tick. */
	dispose(): void {
		clearInterval(this.#tick);
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
	 *  0/1 to its own domain labels (X/O, cyan/pink, …) itself; this class only knows about generic seats. */
	players = $derived(this.data?.players ?? [null, null]);

	/** Which seat the viewer occupies, or null when spectating/not yet joined. Both games are two-seat,
	 *  so the query's `number | null` is narrowed here once instead of at every call site. */
	myIndex = $derived((this.data?.myIndex ?? null) as 0 | 1 | null);

	/** The round currently displayed, whether it's still live, and how it ended, if it has. */
	game = $derived.by(() => ({
		/** The round currently displayed — for round-by-round navigation. */
		round: this.data?.game.round ?? 1,
		/** The room's most recent round — for round-by-round navigation. */
		latestRound: this.data?.game.latestRound ?? this.data?.game.round ?? 1,
		/** False when `getRound` has pinned this to a past round rather than the one still being played. */
		isLive: this.data?.game.isLive ?? true,
		/** The seat whose round has ended against them — a real clock timeout or a resignation — or null. */
		endedSeat: (this.data?.game.endedSeat ?? null) as 0 | 1 | null,
		/** Why `endedSeat`'s round ended, or null. Distinct from `"timeout"` always being assumed, since a
		 *  resignation sets the same end-of-round state as a timeout does. */
		endReason: this.data?.game.endReason ?? null
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

	protected get isClockDisplayFrozen(): boolean {
		return false;
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
