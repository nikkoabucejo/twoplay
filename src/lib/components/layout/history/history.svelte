<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { Button } from "$lib/components/ui";
	import { GAMES, Icon, Playing } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import type {
		GameHistoryEntry,
		RoomHistoryEntry
	} from "../../../../../convex/models/rooms/index.js";

	const RESULT_LABELS: Record<GameHistoryEntry["result"], string> = {
		win: "Win",
		loss: "Loss",
		draw: "Draw",
		playing: "Playing"
	};

	// Distinct from the seat-accent cyan/pink pair (see $lib/utils/style/accents) — this reads as a
	// win/loss verdict, not a player identity, so it borrows the app's semantic destructive token
	// plus two raw palette colors rather than the two seats' own colors.
	const RESULT_CLASSES: Record<GameHistoryEntry["result"], string> = {
		win: "text-emerald-500",
		loss: "text-destructive",
		draw: "text-muted-foreground",
		playing: "text-amber-500"
	};

	const auth = getClerkAuth();
	const history = useQuery(api.models.rooms.index.history, () => (auth.isSignedIn ? {} : "skip"));
	// The single room (if any) this browser is still seated in and hasn't abandoned — same query
	// `play.svelte` uses to bounce back into it, so "active" here always means the same thing there.
	const activeRoom = useQuery(api.models.rooms.index.active, () => (auth.isSignedIn ? {} : "skip"));

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
		{#if activeRoom.data}
			<Playing code={activeRoom.data.code} type={activeRoom.data.type} class="max-w-md shrink-0" />
		{/if}

		<div class="no-scrollbar min-h-0 w-full max-w-md flex-1 overflow-y-auto">
			<ul class="flex flex-col gap-3 py-1">
				{#each history.data as room (room.code)}
					{@const isActive = activeRoom.data?.code === room.code}
					<li
						class={cn(
							"flex flex-col gap-2 rounded-xl border p-3 backdrop-blur-sm",
							isActive ? "border-emerald-500/40 bg-emerald-500/10" : "bg-muted/40"
						)}
					>
						<div class="flex items-center gap-2">
							<Icon type={room.type} class="size-8 shrink-0" active={isActive} sparkles={false} />
							<div class="flex flex-col">
								<span class="flex items-center gap-1.5 text-xs font-semibold">
									{GAMES[room.type].name}
									{#if isActive}
										{@render liveDot()}
									{/if}
								</span>
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
											game.result === "playing" && "animate-pulse",
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

{#snippet liveDot()}
	<span class="relative flex size-1.5" aria-hidden="true">
		<span class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75"
		></span>
		<span class="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
	</span>
{/snippet}

<style>
	.no-scrollbar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
