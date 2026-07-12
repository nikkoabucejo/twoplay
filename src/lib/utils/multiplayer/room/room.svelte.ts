import { useMutation, useQuery, type UseQueryReturn } from "convex-svelte";
import type { GameMove, GameType } from "../../../../../convex/models/games/index.js";
import { api } from "../../../../../convex/_generated/api.js";

/**
 * Shared multiplayer-room plumbing: the live Convex subscription, move/new-game mutations, and the
 * round/live/players/scores state every game's room class needs. Subclasses (`TictactoeRoom`,
 * `CheckersRoom`) add only their own game-specific derived state (board, legal moves, turn, …) and
 * call `submitMove` after validating a move is theirs to make.
 */
export abstract class Room {
	error = $state<string | null>(null);

	#kind: GameType;
	#getCode: () => string;
	#room: UseQueryReturn<typeof api.models.rooms.index.get>;
	#play = useMutation(api.models.rooms.index.play);
	#newGame = useMutation(api.models.rooms.index.newGame);
	#setEmoji = useMutation(api.models.rooms.index.setEmoji);

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
	}

	get isLoading() {
		return this.#room.isLoading;
	}

	get data() {
		return this.#room.data;
	}

	/** True once the room is found but belongs to a different game type — a room-code collision across games. */
	wrongGameType = $derived.by(() => this.data != null && this.data.name !== this.#kind);

	/** False when `getRound` has pinned this to a past round rather than the one still being played. */
	isLive = $derived(this.data?.isLive ?? true);

	/** The round currently displayed, and the room's most recent round — for round-by-round navigation. */
	game = $derived(this.data?.game ?? 1);
	round = $derived(this.data?.round ?? this.game);

	/** The two seats' player info and running scores, indexed by seat — each game maps 0/1 to its own
	 *  domain labels (X/O, cyan/pink, …) itself; this class only knows about generic seats. */
	players = $derived(this.data?.players ?? [null, null]);
	scores = $derived(this.data?.scores ?? [0, 0]);

	/** Which seat the viewer occupies, or null when spectating/not yet joined. Both games are two-seat,
	 *  so the query's `number | null` is narrowed here once instead of at every call site. */
	myIndex = $derived((this.data?.myIndex ?? null) as 0 | 1 | null);

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

	async newGame(): Promise<void> {
		if (!this.isLive) return;

		this.error = null;
		try {
			await this.#newGame({ code: this.#getCode() });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}

	async setEmoji(emoji: string): Promise<void> {
		this.error = null;
		try {
			await this.#setEmoji({ code: this.#getCode(), emoji });
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Something went wrong";
		}
	}
}
