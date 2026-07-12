import { useMutation, useQuery, type UseQueryReturn } from "convex-svelte";
import { api } from "../../../../../convex/_generated/api.js";
import type { PeerCursor } from "./types.js";

/** Minimum time between cursor-position mutations, so a mouse-move flood doesn't flood Convex. */
const SEND_INTERVAL_MS = 80;
/** A peer's cursor is hidden once its last update is older than this — covers crashed tabs/lost network. */
const STALE_MS = 4000;

/**
 * Rune-backed presence for a room: throttles and sends the local pointer position,
 * and derives the live, non-stale list of other players' cursors from a Convex subscription.
 */
export class CursorPresence {
	#getCode: () => string;
	#peers: UseQueryReturn<typeof api.models.cursors.index.list>;
	#update = useMutation(api.models.cursors.index.update);
	#clear = useMutation(api.models.cursors.index.clear);
	#lastSentAt = 0;

	#now = $state(Date.now());
	#tick: ReturnType<typeof setInterval>;

	constructor(getCode: () => string) {
		this.#getCode = getCode;
		this.#peers = useQuery(api.models.cursors.index.list, () => ({ code: this.#getCode() }));
		this.#tick = setInterval(() => (this.#now = Date.now()), 1000);
	}

	get #peersData(): PeerCursor[] {
		return (this.#peers.data ?? []) as PeerCursor[];
	}

	peers = $derived(this.#peersData.filter((peer) => this.#now - peer.updatedAt < STALE_MS));

	/** Call on every pointer move over the tracked area, with `x`/`y` normalized 0-1. */
	move(x: number, y: number): void {
		const now = Date.now();
		if (now - this.#lastSentAt < SEND_INTERVAL_MS) return;
		this.#lastSentAt = now;
		this.#update({ code: this.#getCode(), x, y }).catch(() => {});
	}

	/** Call when the pointer leaves the tracked area, so this player's cursor disappears immediately for peers. */
	leave(): void {
		this.#clear({ code: this.#getCode() }).catch(() => {});
	}

	/** Call on component teardown to stop the staleness clock and hide this player's cursor for peers. */
	dispose(): void {
		clearInterval(this.#tick);
		this.leave();
	}
}
