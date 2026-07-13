<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { CheckersIcon, TictactoeIcon } from "$lib/assets/icons/games";
	import { Button } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import type {
		GameHistoryEntry,
		RoomHistoryEntry
	} from "../../../../../convex/models/rooms/index.js";

	const GAME_ICONS = {
		tictactoe: TictactoeIcon,
		checkers: CheckersIcon
	} as const;

	const GAME_NAMES = {
		tictactoe: "Tic-Tac-Toe",
		checkers: "Checkers"
	} as const;

	const RESULT_LABELS: Record<GameHistoryEntry["result"], string> = {
		win: "Win",
		loss: "Loss",
		draw: "Draw",
		"in-progress": "Playing"
	};

	// Distinct from the seat-accent cyan/pink pair (see $lib/utils/style/accents) — this reads as a
	// win/loss verdict, not a player identity, so it borrows the app's semantic destructive token
	// plus two raw palette colors rather than the two seats' own colors.
	const RESULT_CLASSES: Record<GameHistoryEntry["result"], string> = {
		win: "text-emerald-500",
		loss: "text-destructive",
		draw: "text-muted-foreground",
		"in-progress": "text-amber-500"
	};

	const auth = getClerkAuth();
	const history = useQuery(api.models.rooms.index.listForUser, () =>
		auth.isSignedIn ? {} : "skip"
	);

	function formatDate(createdAt: number) {
		return new Date(createdAt).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}
</script>

<div class="flex w-full flex-1 flex-col items-center gap-3 overflow-hidden px-4 pt-20 pb-6">
	{#if !auth.isSignedIn}
		<div class="flex shrink-0 flex-col items-center gap-3">
			<p class="text-sm text-muted-foreground">Sign in to see your games.</p>
			<Button size="sm" onclick={() => auth.signIn()}>Sign in</Button>
		</div>
	{:else if history.isLoading}
		<p class="shrink-0 text-sm text-muted-foreground">Loading…</p>
	{:else if history.error}
		<p class="shrink-0 text-sm text-destructive">Could not load your games.</p>
	{:else if !history.data?.length}
		<p class="shrink-0 text-sm text-muted-foreground">You haven't played any games yet.</p>
	{:else}
		<div class="no-scrollbar min-h-0 w-full max-w-md flex-1 overflow-y-auto">
			<ul class="flex flex-col gap-3 py-1">
				{#each history.data as room (room.code)}
					{@const Icon = GAME_ICONS[room.type]}
					<li class="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3 backdrop-blur-sm">
						<div class="flex items-center gap-2">
							<Icon class="size-8 shrink-0" />
							<div class="flex flex-col">
								<span class="text-xs font-semibold">{GAME_NAMES[room.type]}</span>
								<span class="text-[11px] text-muted-foreground">
									You vs {room.opponentName ?? "waiting for opponent"}
								</span>
							</div>
							<span class="ml-auto font-mono text-[11px] text-muted-foreground">
								{room.code}
							</span>
						</div>

						<ul class="flex flex-col gap-1.5">
							{#each room.games as game (game.round)}
								<li class="flex items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5">
									<div class="flex flex-1 flex-col">
										<span class="text-xs font-medium">Game {game.round}</span>
										<span class="text-[11px] text-muted-foreground">
											{formatDate(game.createdAt)}
										</span>
									</div>
									<span
										class={cn(
											"text-[11px] font-semibold uppercase tracking-wide",
											RESULT_CLASSES[game.result]
										)}
									>
										{RESULT_LABELS[game.result]}
									</span>
									<Button href="/{room.type}/{room.code}/{game.round}" variant="outline" size="xs">
										View
									</Button>
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.no-scrollbar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
