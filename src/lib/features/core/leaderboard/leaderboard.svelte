<script lang="ts">
	import { useQuery } from "convex-svelte";
	import type { Attachment } from "svelte/attachments";
	import { Crown, Medal } from "@lucide/svelte";
	import { Empty, Gate, Skeleton } from "$lib/components/ui";
	import { Feed } from "$lib/components/layout";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { splitPodium } from "./standings.js";
	import { api } from "../../../../../convex/_generated/api.js";
	import type { LeaderboardEntry } from "../../../../../convex/models/ratings/index.js";

	// Circular badge treatment for the podium — gold/silver/bronze. Kept as complete class strings
	// (see $lib/utils/style/accents) so Tailwind's scanner picks them up verbatim.
	const PODIUM_BADGE_CLASSES: Record<number, string> = {
		1: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950",
		2: "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900",
		3: "bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950"
	};

	// Shared with the loading skeleton so the loaded podium replaces it in the same box.
	const PODIUM_CARD_CLASS =
		"flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-3 text-center backdrop-blur-sm";

	const auth = getClerkAuth();
	const leaderboard = useQuery(api.models.ratings.index.top, () => (auth.isSignedIn ? {} : "skip"));
	// One batched call for every row's stats rather than one query per row — keyed by userId so each
	// row just indexes into the result once `leaderboard.data` itself has resolved.
	const rowStats = useQuery(api.models.rooms.index.statsForUsers, () =>
		leaderboard.data?.length ? { userIds: leaderboard.data.map((entry) => entry.userId) } : "skip"
	);

	const standings = $derived(splitPodium(leaderboard.data ?? []));
	const pinnedIndex = $derived(standings.rest.findIndex((entry) => entry.isMe));

	let isOwnRowInView = $state(true);

	// The implicit root is the viewport, clipped by every scrolling ancestor, so this also notices
	// the row leaving the Feed.
	const watchOwnRow: Attachment<HTMLElement> = (row) => {
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) isOwnRowInView = entry.isIntersecting;
		});
		observer.observe(row);
		return () => observer.disconnect();
	};
</script>

{#snippet rankCells(entry: LeaderboardEntry, rank: number)}
	{@const stats = rowStats.data?.[entry.userId]}
	{@const cellClass = cn("py-2.5", entry.isMe ? "bg-emerald-500/10" : "bg-muted/40")}
	<td class={cn(cellClass, "rounded-l-xl pl-3")}>
		<span
			class="flex size-9 items-center justify-center rounded-full bg-muted font-mono text-sm font-bold text-muted-foreground"
		>
			{rank}
		</span>
	</td>
	<td class={cn(cellClass, "px-3")}>
		<div class="flex min-w-0 flex-col">
			<span class="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
				<span class="truncate">{entry.name}</span>
				{#if entry.isMe}
					<span class="text-caption font-bold text-emerald-500">YOU</span>
				{/if}
			</span>
			<span class="truncate text-caption text-muted-foreground lg:hidden">
				{stats ? `${stats.totalGames} games · ${stats.winRate}% win` : "—"}
			</span>
		</div>
	</td>
	<td class={cn(cellClass, "hidden px-3 text-right font-mono text-sm tabular-nums lg:table-cell")}>
		{stats ? stats.totalGames : "—"}
	</td>
	<td class={cn(cellClass, "hidden px-3 text-right font-mono text-sm tabular-nums lg:table-cell")}>
		{stats ? `${stats.winRate}%` : "—"}
	</td>
	<td
		class={cn(cellClass, "rounded-r-xl pr-3 text-right font-mono text-sm font-bold tabular-nums")}
	>
		{entry.rating}
	</td>
{/snippet}

<div
	class="flex min-h-0 w-full flex-1 flex-col items-center gap-3 overflow-hidden max-lg:overflow-visible lg:items-stretch"
>
	{#if !auth.isSignedIn}
		<Gate message="Sign in to see the leaderboard." class="shrink-0" />
	{:else if leaderboard.isLoading}
		<!-- Takes the Feed's box, with the podium's cards and the table's rows. -->
		<div role="status" class="min-h-0 w-full max-w-2xl flex-1 overflow-hidden lg:max-w-none">
			<span class="sr-only">Loading</span>
			<div class="flex flex-col gap-3 py-1" aria-hidden="true">
				<div class="grid grid-cols-3 gap-2">
					{#each { length: 3 }, index (index)}
						<div class={cn(PODIUM_CARD_CLASS, "bg-muted/40")}>
							<Skeleton class="size-9 rounded-full" />
							<Skeleton class="h-5 w-16 max-w-full" />
							<Skeleton class="h-5 w-10" />
						</div>
					{/each}
				</div>
				<div class="flex flex-col gap-2 pt-6">
					{#each { length: 5 }, index (index)}
						<div class="flex h-14 items-center gap-3 rounded-xl bg-muted/40 px-3">
							<Skeleton class="size-9 shrink-0 rounded-full" />
							<div class="flex flex-1 flex-col gap-1.5">
								<Skeleton class="h-3.5 w-24" />
								<Skeleton class="h-3 w-32 max-w-full" />
							</div>
							<Skeleton class="h-4 w-8" />
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else if leaderboard.error}
		<p class="shrink-0 text-sm text-destructive">Could not load the leaderboard.</p>
	{:else if !standings.podium.length}
		<Empty
			title="No ratings yet"
			description="Finish a game to get on the board."
			class="shrink-0"
		/>
	{:else}
		<!-- No edge fade: it would wash out the pinned row at the bottom. Below lg the page scrolls
		     instead of the Feed, so the pinned row sticks to the bottom of <main>. -->
		<Feed class="mask-none max-lg:overflow-visible lg:max-w-none">
			<div class="flex flex-col gap-3 py-1">
				<ol aria-label="Top three" class="grid grid-cols-3 gap-2">
					{#each standings.podium as entry, index (entry.userId)}
						{@const rank = index + 1}
						<li
							class={cn(
								PODIUM_CARD_CLASS,
								entry.isMe ? "border-emerald-500/40 bg-emerald-500/10" : "bg-muted/40"
							)}
						>
							<span
								class={cn(
									"flex size-9 items-center justify-center rounded-full",
									PODIUM_BADGE_CLASSES[rank]
								)}
							>
								{#if rank === 1}
									<Crown class="size-4" aria-hidden="true" />
								{:else}
									<Medal class="size-4" aria-hidden="true" />
								{/if}
								<span class="sr-only">Rank {rank}</span>
							</span>
							<span
								class="flex w-full min-w-0 items-center justify-center gap-1 text-sm font-semibold"
							>
								<span class="truncate">{entry.name}</span>
								{#if entry.isMe}
									<span class="text-caption font-bold text-emerald-500">YOU</span>
								{/if}
							</span>
							<span class="font-mono text-sm font-bold tabular-nums">{entry.rating}</span>
						</li>
					{/each}
				</ol>

				{#if standings.rest.length}
					<table class="w-full table-fixed border-separate border-spacing-y-2 text-left">
						<thead>
							<tr class="text-caption text-muted-foreground">
								<th scope="col" class="w-16 pl-3 font-medium">Rank</th>
								<th scope="col" class="px-3 font-medium">Player</th>
								<th scope="col" class="hidden w-20 px-3 text-right font-medium lg:table-cell"
									>Games</th
								>
								<th scope="col" class="hidden w-20 px-3 text-right font-medium lg:table-cell"
									>Win rate</th
								>
								<th scope="col" class="w-16 pr-3 text-right font-medium">Rating</th>
							</tr>
						</thead>
						<tbody>
							{#each standings.rest as entry, index (entry.userId)}
								<tr {@attach entry.isMe && watchOwnRow}>
									{@render rankCells(entry, index + 4)}
								</tr>
							{/each}
						</tbody>
						{#if pinnedIndex >= 0}
							<!-- Always rendered, so showing it takes no new space. -->
							<tfoot
								class={cn("sticky bottom-0 bg-background", isOwnRowInView && "invisible")}
								aria-hidden={isOwnRowInView}
							>
								<tr>{@render rankCells(standings.rest[pinnedIndex], pinnedIndex + 4)}</tr>
							</tfoot>
						{/if}
					</table>
				{/if}
			</div>
		</Feed>
	{/if}
</div>
