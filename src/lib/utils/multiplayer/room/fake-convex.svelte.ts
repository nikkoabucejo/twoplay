// Test-only stand-in for `convex-svelte`. Wire it up per test file with
// `vi.mock("convex-svelte", () => import("$lib/utils/multiplayer/room/fake-convex.svelte.js"))`.
import { getFunctionName, type FunctionReference, type FunctionReturnType } from "convex/server";
import { SvelteMap } from "svelte/reactivity";
import { vi, type Mock } from "vitest";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import type { api } from "../../../../../convex/_generated/api.js";
import type { GameState } from "../../../../../convex/models/games/index.js";

type MutationMock = Mock<(args: Record<string, unknown>) => Promise<unknown>>;

const results = new SvelteMap<string, unknown>();
const mutations = new Map<string, MutationMock>();

export function useQuery(query: FunctionReference<"query">) {
	const name = getFunctionName(query);
	return {
		get data() {
			return results.get(name);
		},
		get isLoading() {
			return results.get(name) === undefined;
		},
		error: undefined,
		isStale: false
	};
}

export function useMutation(mutation: FunctionReference<"mutation">) {
	return mutationFor(mutation);
}

/** Drives what every `useQuery` subscribed to `query` currently returns. `undefined` means loading. */
export function setQueryResult<Query extends FunctionReference<"query">>(
	query: Query,
	value: FunctionReturnType<Query> | undefined
) {
	results.set(getFunctionName(query), value);
}

/** The shared mock behind every `useMutation(mutation)`. Resolves to null unless reconfigured. */
export function mutationFor(mutation: FunctionReference<"mutation">): MutationMock {
	const name = getFunctionName(mutation);
	let mock = mutations.get(name);
	if (!mock) {
		mock = vi.fn(async () => null);
		mutations.set(name, mock);
	}
	return mock;
}

/** A promise the test settles by hand, e.g. `mutationFor(play).mockReturnValueOnce(held.promise)`
 *  to keep a move in flight. */
export function deferred<T>() {
	return Promise.withResolvers<T>();
}

export function resetConvex() {
	results.clear();
	mutations.clear();
}

/** Runs `create` inside an effect root, since `Room` and friends register `$effect`s on construction. */
export function createRooted<T>(create: () => T): { instance: T; destroy: () => void } {
	const created: T[] = [];
	const destroy = $effect.root(() => {
		created.push(create());
	});
	return { instance: created[0], destroy };
}

export type RoomSnapshot = NonNullable<FunctionReturnType<typeof api.models.rooms.index.get>>;
type HistoryMoves = FunctionReturnType<typeof api.models.games.index.history>;

export const ALICE = { name: "Alice Archer", emoji: "1f600", score: 2, seenAt: null };
export const BOB = { name: "Bob Baker", emoji: "1f525", score: 1, seenAt: null };

/** A live, two-seat room with the viewer in seat 0 and both clocks banked at one minute. */
export function roomSnapshot(
	state: GameState,
	overrides: {
		type?: RoomSnapshot["type"];
		status?: RoomSnapshot["status"];
		players?: RoomSnapshot["players"];
		myIndex?: RoomSnapshot["myIndex"];
		game?: Partial<Omit<RoomSnapshot["game"], "state">>;
		clock?: Partial<RoomSnapshot["clock"]>;
	} = {}
): RoomSnapshot {
	return {
		code: "ABCD",
		type: overrides.type ?? state.kind,
		status: overrides.status ?? "active",
		players: overrides.players ?? [ALICE, BOB],
		myIndex: overrides.myIndex === undefined ? 0 : overrides.myIndex,
		game: {
			state,
			round: 1,
			latestRound: 1,
			isLive: true,
			endedSeat: null,
			reason: null,
			...overrides.game
		},
		clock: { remaining: [60_000, 60_000], turnedAt: null, ...overrides.clock }
	};
}

/** One history row per state, in play order — each row is the position right after that move. */
export function historyOf(states: GameState[]): HistoryMoves {
	return states.map((state, turn) => ({
		_id: `move-${turn}` as Id<"moves">,
		_creationTime: turn,
		gameId: "game-1" as Id<"games">,
		playerId: `player-${turn % 2}` as Id<"players">,
		turn,
		state
	}));
}
