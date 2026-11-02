<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { SvelteSet } from "svelte/reactivity";
	import { Button, Emblem, EmptyState, Playing, Tile } from "$lib/components/ui";
	import { Feed, FeedSkeleton } from "$lib/components/layout";
	import { GAMES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { splitHistory } from "./rooms.js";
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
	// Every room that was active during this page view. One that finishes stays in the Playing slot
	// until the next visit, so it never jumps into the top of the list.
	const seenActiveCodes = new SvelteSet<string>();
	$effect(() => {
		if (activeRoom.data) seenActiveCodes.add(activeRoom.data.code);
	});
	const rooms = $derived(splitHistory(history.data ?? [], activeRoom.data?.code, seenActiveCodes));

	function formatDate(createdAt: number) {
		return new Date(createdAt).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}
</script>

{#snippet roomTile(room: RoomHistoryEntry)}
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
					<!-- Always in the row, so a rating arriving after the result doesn't move View. -->
					<span
						class={cn(
							"inline-block w-7 shrink-0 text-right font-mono text-caption font-semibold tabular-nums",
							game.mmr === null && "invisible",
							game.mmr !== null && (game.mmr > 0 ? "text-emerald-500" : "text-destructive")
						)}
					>
						{#if game.mmr !== null}
							{game.mmr > 0 ? "+" : "-"}{Math.abs(game.mmr)}
						{/if}
					</span>
					<Button href="/{room.type}/{room.code}/{game.round}" variant="outline" size="xs">
						View
					</Button>
				</li>
			{/each}
		</ul>
	</Tile>
{/snippet}

<!-- Newest on top: the Playing card, then the held rooms. The slot sits under the flex-1 feed, so
     anything added grows it upward and nothing already shown moves. Capped so held rooms can't
     squeeze the feed out. -->
{#snippet playingSlot()}
	{#if activeRoom.data || rooms.held.length}
		<div
			data-slot="playing"
			class="flex max-h-2/5 min-h-0 w-full max-w-md shrink-0 flex-col gap-2 overflow-y-auto py-1"
		>
			{#if activeRoom.data}
				<Playing code={activeRoom.data.code} type={activeRoom.data.type} class="shrink-0" />
			{/if}
			{#if rooms.held.length}
				<ul class="flex flex-col gap-2">
					{#each rooms.held as room (room.code)}
						{@render roomTile(room)}
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
{/snippet}

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
	{:else if !rooms.list.length && !rooms.held.length}
		<EmptyState title="No games yet" description="Games you play show up here." class="shrink-0" />
		{@render playingSlot()}
	{:else}
		<Feed>
			<ul class="flex flex-col gap-2 py-1">
				{#each rooms.list as room (room.code)}
					{@render roomTile(room)}
				{/each}
			</ul>
		</Feed>

		<!-- Below the feed, so a room started or finished elsewhere shrinks the feed instead of pushing it down. -->
		{@render playingSlot()}
	{/if}
</div>
