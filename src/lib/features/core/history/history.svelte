<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { Button, Emblem, EmptyState, Playing, Tile } from "$lib/components/ui";
	import { Feed, FeedSkeleton } from "$lib/components/layout";
	import { GAMES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { withoutActiveRoom } from "./rooms.js";
	import { api } from "../../../../../convex/_generated/api.js";
	import type { GameHistoryEntry } from "../../../../../convex/models/rooms/index.js";

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
	const rooms = $derived(withoutActiveRoom(history.data ?? [], activeRoom.data?.code));

	function formatDate(createdAt: number) {
		return new Date(createdAt).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}
</script>

<div class="flex min-h-0 w-full flex-1 flex-col items-center gap-3 overflow-hidden">
	{#if !auth.isSignedIn}
		<div class="flex shrink-0 flex-col items-center gap-3">
			<p class="text-sm text-muted-foreground">Sign in to see your games.</p>
			<Button size="sm" disabled={auth.loadError !== null} onclick={() => auth.signIn()}>
				Sign in
			</Button>
		</div>
	{:else if history.isLoading || activeRoom.isLoading}
		<FeedSkeleton />
	{:else if history.error}
		<p class="shrink-0 text-sm text-destructive">Could not load your games.</p>
	{:else if !rooms.length}
		<EmptyState title="No games yet" description="Games you play show up here." class="shrink-0" />
		{#if activeRoom.data}
			<Playing code={activeRoom.data.code} type={activeRoom.data.type} class="max-w-md shrink-0" />
		{/if}
	{:else}
		<Feed>
			<ul class="flex flex-col gap-2 py-1">
				{#each rooms as room (room.code)}
					<Tile>
						{#snippet icon()}
							<Emblem
								icon={GAMES[room.type].icon}
								colors={GAMES[room.type].colors}
								class="size-8 shrink-0"
								sparkles={false}
							/>
						{/snippet}
						{#snippet title()}
							<span class="text-xs font-semibold">{GAMES[room.type].name}</span>
						{/snippet}
						{#snippet subtitle()}
							<span class="text-caption text-muted-foreground">
								You vs {room.opponentName ?? "waiting for opponent"}
							</span>
						{/snippet}
						{#snippet trailing()}
							<span class="font-mono text-caption text-muted-foreground">{room.code}</span>
						{/snippet}

						<ul class="flex flex-col gap-1.5">
							{#each room.games as game (game.round)}
								<li class="flex items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5">
									<div class="flex flex-1 flex-col">
										<span class="text-xs font-medium">Game {game.round}</span>
										<span class="text-caption text-muted-foreground">
											{formatDate(game.createdAt)}
										</span>
									</div>
									<span
										class={cn(
											"text-caption font-semibold uppercase tracking-wide",
											game.result === "playing" && "motion-safe:animate-pulse",
											RESULT_CLASSES[game.result]
										)}
									>
										{RESULT_LABELS[game.result]}
									</span>
									{#if game.mmr !== null}
										<span
											class={cn(
												"inline-block w-7 shrink-0 text-right font-mono text-caption font-semibold tabular-nums",
												game.mmr > 0 ? "text-emerald-500" : "text-destructive"
											)}
										>
											{game.mmr > 0 ? "+" : "-"}{Math.abs(game.mmr)}
										</span>
									{/if}
									<Button href="/{room.type}/{room.code}/{game.round}" variant="outline" size="xs">
										View
									</Button>
								</li>
							{/each}
						</ul>
					</Tile>
				{/each}
			</ul>
		</Feed>

		<!-- Below the feed, so a room started elsewhere shrinks the feed instead of pushing it down. -->
		{#if activeRoom.data}
			<Playing code={activeRoom.data.code} type={activeRoom.data.type} class="max-w-md shrink-0" />
		{/if}
	{/if}
</div>
