<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { SvelteSet } from "svelte/reactivity";
	import { RotateCcw } from "@lucide/svelte";
	import { Button, Emblem, Empty, Gate, Playing, Skeleton } from "$lib/components/ui";
	import { Feed } from "$lib/components/layout";
	import { GAMES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { splitHistory } from "./rooms.js";
	import {
		formatRatingChange,
		groupByDay,
		reasonLabel,
		toRounds,
		type HistoryRound
	} from "./rounds.js";
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
		win: "bg-emerald-500/15 text-emerald-500",
		loss: "bg-destructive/15 text-destructive",
		draw: "bg-muted text-muted-foreground",
		playing: "text-amber-500"
	};

	// Fixed tracks, so every column starts at the same x in every row. Shared with the skeleton.
	const ROW_CLASS =
		"grid grid-cols-[2rem_minmax(0,1fr)_1.25rem_4rem_1.75rem_1.5rem] items-center gap-2 rounded-xl border bg-muted/40 p-3 backdrop-blur-sm @sm:grid-cols-[2rem_minmax(0,1fr)_1.25rem_4rem_1.75rem_4rem]";
	const SKELETON_ROWS = 5;

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
	const now = Date.now();
	const days = $derived(groupByDay(toRounds(rooms.list), now));
	const heldRounds = $derived(toRounds(rooms.held));
</script>

{#snippet roundRow(round: HistoryRound)}
	{@const game = GAMES[round.type].name}
	{@const ratingChange = formatRatingChange(round.mmr)}
	{@const reason = reasonLabel(round.reason)}
	{@const opponent = round.opponentName ? ` vs ${round.opponentName}` : ""}
	<!-- Below @sm the Replay label becomes an icon, in every row at once, to leave room for the name. -->
	<li class={ROW_CLASS}>
		<Emblem
			icon={GAMES[round.type].icon}
			colors={GAMES[round.type].colors}
			class="size-8"
			sparkles={false}
		/>
		<div class="flex min-w-0 flex-col">
			<span class="truncate text-xs font-semibold">{game}</span>
			<span class="flex min-w-0 items-center gap-1 text-caption text-muted-foreground">
				<span class="truncate">{round.opponentName ?? "Waiting for an opponent"}</span>
				<span aria-hidden="true">·</span>
				<span class="whitespace-nowrap">Round {round.round}</span>
			</span>
		</div>
		{#if round.result === "playing"}
			<span
				class={cn(
					"col-span-2 text-caption font-semibold tracking-wide whitespace-nowrap uppercase motion-safe:animate-pulse",
					RESULT_CLASSES.playing
				)}
			>
				{RESULT_LABELS.playing}
			</span>
		{:else}
			<span
				class={cn(
					"flex size-5 items-center justify-center rounded-md font-mono text-caption font-bold",
					RESULT_CLASSES[round.result]
				)}
			>
				<span aria-hidden="true">{RESULT_LABELS[round.result][0]}</span>
				<span class="sr-only">{RESULT_LABELS[round.result]}</span>
			</span>
			<span class="text-caption whitespace-nowrap text-muted-foreground">{reason ?? ""}</span>
		{/if}
		<span
			class={cn(
				"text-right font-mono text-caption font-semibold tabular-nums",
				ratingChange === null && "text-muted-foreground",
				round.mmr !== null && round.mmr > 0 && "text-emerald-500",
				round.mmr !== null && round.mmr < 0 && "text-destructive",
				round.mmr === 0 && "text-muted-foreground"
			)}
		>
			{ratingChange ?? "—"}
		</span>
		{#if round.result !== "playing"}
			<Button
				href="/{round.type}/{round.code}/{round.round}"
				variant="outline"
				size="xs"
				class="justify-self-end @max-sm:w-6 @max-sm:px-0"
				aria-label="Replay {game} round {round.round}{opponent}, room {round.code}"
			>
				<RotateCcw class="@sm:hidden" aria-hidden="true" />
				<span class="@max-sm:hidden">Replay</span>
			</Button>
		{/if}
	</li>
{/snippet}

{#snippet skeleton()}
	<!-- Takes the Feed's box: one day heading over rows with the same tracks as a finished round. -->
	<div role="status" data-loading="history" class="min-h-0 w-full max-w-2xl flex-1 overflow-hidden">
		<span class="sr-only">Loading your games</span>
		<div class="flex flex-col gap-4 py-1" aria-hidden="true">
			<section class="flex flex-col gap-2">
				<Skeleton variant="text" class="h-4 w-14" />
				<ul class="@container flex flex-col gap-2">
					{#each { length: SKELETON_ROWS }, index (index)}
						<li class={ROW_CLASS}>
							<Skeleton class="size-8 rounded-full" />
							<div class="flex min-w-0 flex-col">
								<Skeleton variant="text" class="h-4 w-20" />
								<Skeleton variant="text" class="h-4 w-32 max-w-full" />
							</div>
							<Skeleton class="size-5" />
							<Skeleton variant="text" class="h-4 w-14" />
							<Skeleton variant="text" class="h-4 w-7" />
							<Skeleton class="h-6 w-6 justify-self-end @sm:w-16" />
						</li>
					{/each}
				</ul>
			</section>
		</div>
	</div>
{/snippet}

<!-- Newest on top: the Playing card, then the held rooms. The slot sits under the flex-1 feed, so
     anything added grows it upward and nothing already shown moves. Capped so held rooms can't
     squeeze the feed out. -->
{#snippet playingSlot()}
	{#if activeRoom.data || rooms.held.length}
		<div
			data-slot="playing"
			class="flex max-h-2/5 min-h-0 w-full max-w-2xl shrink-0 flex-col gap-2 overflow-y-auto py-1"
		>
			{#if activeRoom.data}
				<Playing code={activeRoom.data.code} type={activeRoom.data.type} class="shrink-0" />
			{/if}
			{#if heldRounds.length}
				<ul class="@container flex flex-col gap-2">
					{#each heldRounds as round (`${round.code}-${round.round}`)}
						{@render roundRow(round)}
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
{/snippet}

<div class="flex min-h-0 w-full flex-1 flex-col items-center gap-3 overflow-hidden">
	{#if !auth.isSignedIn}
		<Gate message="Sign in to see your games." class="shrink-0" />
	{:else if history.isLoading || activeRoom.isLoading}
		{@render skeleton()}
	{:else if history.error}
		<p class="shrink-0 text-sm text-destructive">Could not load your games.</p>
	{:else if !rooms.list.length && !rooms.held.length}
		<Empty title="No games yet" description="Games you play show up here." class="shrink-0" />
		{@render playingSlot()}
	{:else}
		<Feed data-loaded="history">
			<div class="flex flex-col gap-4 py-1">
				{#each days as day (day.label)}
					<section class="flex flex-col gap-2">
						<h2 class="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
							{day.label}
						</h2>
						<ul class="@container flex flex-col gap-2">
							{#each day.rounds as round (`${round.code}-${round.round}`)}
								{@render roundRow(round)}
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		</Feed>

		<!-- Below the feed, so a room started or finished elsewhere shrinks the feed instead of pushing it down. -->
		{@render playingSlot()}
	{/if}
</div>
