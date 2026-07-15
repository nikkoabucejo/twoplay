<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { Crown, Medal, Trophy } from "@lucide/svelte";
	import { Button, Sparkle } from "$lib/components/ui";
	import { Feed } from "$lib/components/layout";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";

	// Circular badge treatment per rank — gold/silver/bronze for the podium, a plain numbered
	// badge past that. Kept as complete class strings (see $lib/utils/style/accents) so Tailwind's
	// scanner picks them up verbatim.
	const PODIUM_BADGE_CLASSES: Record<number, string> = {
		1: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950",
		2: "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900",
		3: "bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950"
	};

	const auth = getClerkAuth();
	const leaderboard = useQuery(api.models.ratings.index.top, () => (auth.isSignedIn ? {} : "skip"));
	const myRating = useQuery(api.models.ratings.index.mine, () => (auth.isSignedIn ? {} : "skip"));
	const myStats = useQuery(api.models.rooms.index.stats, () => (auth.isSignedIn ? {} : "skip"));
	// One batched call for every row's stats rather than one query per row — keyed by userId so each
	// row just indexes into the result once `leaderboard.data` itself has resolved.
	const rowStats = useQuery(api.models.rooms.index.statsForUsers, () =>
		leaderboard.data?.length ? { userIds: leaderboard.data.map((entry) => entry.userId) } : "skip"
	);

	const myRankIndex = $derived(leaderboard.data?.findIndex((entry) => entry.isMe) ?? -1);
	const myRank = $derived(myRankIndex >= 0 ? myRankIndex + 1 : null);
</script>

<div class="flex w-full min-h-0 flex-1 flex-col items-center gap-3 overflow-hidden px-4 py-6">
	{#if !auth.isSignedIn}
		<div class="flex shrink-0 flex-col items-center gap-3">
			<p class="text-sm text-muted-foreground">Sign in to see the leaderboard.</p>
			<Button size="sm" onclick={() => auth.signIn()}>Sign in</Button>
		</div>
	{:else if leaderboard.isLoading || myRating.isLoading || myStats.isLoading}
		<p class="shrink-0 text-sm text-muted-foreground">Loading…</p>
	{:else if leaderboard.error || myRating.error || myStats.error}
		<p class="shrink-0 text-sm text-destructive">Could not load the leaderboard.</p>
	{:else}
		<div
			class="relative w-full max-w-md shrink-0 overflow-hidden rounded-2xl border bg-muted/40 p-6 text-center backdrop-blur-sm"
		>
			<Sparkle colors={["#06b6d4", "#ec4899"]} variant="title" class="opacity-70" />
			<div class="relative z-10 flex flex-col items-center gap-1.5">
				<span
					class="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>
					<Trophy class="size-3.5" />
					Your Rating
				</span>
				<span class="hero-rating__value font-mono text-4xl font-bold tabular-nums">
					{myRating.data}
				</span>
				<span class="text-xs text-muted-foreground">
					{#if myRank}
						Rank #{myRank} of {leaderboard.data?.length}
					{:else}
						Not yet in the top {leaderboard.data?.length}
					{/if}
				</span>

				<div class="mt-2 flex items-center gap-4 border-t border-border/60 pt-3">
					<div class="flex flex-col items-center gap-0.5">
						<span class="font-mono text-sm font-semibold tabular-nums">
							{myStats.data?.totalGames ?? 0}
						</span>
						<span class="text-[11px] text-muted-foreground">Games</span>
					</div>
					<div class="h-6 w-px bg-border"></div>
					<div class="flex flex-col items-center gap-0.5">
						<span class="font-mono text-sm font-semibold tabular-nums">
							{myStats.data?.winRate ?? 0}%
						</span>
						<span class="text-[11px] text-muted-foreground">Win rate</span>
					</div>
				</div>
			</div>
		</div>

		{#if !leaderboard.data?.length}
			<p class="shrink-0 text-sm text-muted-foreground">No ratings yet — be the first to play.</p>
		{:else}
			<Feed>
				<ul class="flex flex-col gap-2 py-1">
					{#each leaderboard.data as entry, index (entry.userId)}
						{@const rank = index + 1}
						{@const stats = rowStats.data?.[entry.userId]}
						<li
							class={cn(
								"flex items-center gap-3 rounded-xl border p-3 backdrop-blur-sm",
								entry.isMe ? "border-emerald-500/40 bg-emerald-500/10" : "bg-muted/40"
							)}
						>
							<div
								class={cn(
									"flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold",
									PODIUM_BADGE_CLASSES[rank] ?? "bg-muted text-muted-foreground"
								)}
							>
								{#if rank === 1}
									<Crown class="size-4" />
								{:else if rank <= 3}
									<Medal class="size-4" />
								{:else}
									{rank}
								{/if}
							</div>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="flex items-center gap-1.5 truncate text-sm font-semibold">
									{entry.name}
									{#if entry.isMe}
										<span class="text-[10px] font-bold text-emerald-500">YOU</span>
									{/if}
								</span>
								<span class="text-[11px] text-muted-foreground">
									{stats?.totalGames ?? 0} games · {stats?.winRate ?? 0}% win
								</span>
							</div>
							<span class="font-mono text-sm font-bold tabular-nums">{entry.rating}</span>
						</li>
					{/each}
				</ul>
			</Feed>
		{/if}
	{/if}
</div>

<style>
	/* Same strong-to-weak (never zero) pulse as the wordmark on the home page (see
	   src/routes/(games)/+page.svelte's `glow-pulse-player1`/`-player2`), just slower and stronger —
	   this is the one number on the page that should feel most alive. */
	.hero-rating__value {
		animation: hero-rating-glow 5s ease-in-out infinite;
	}

	@keyframes hero-rating-glow {
		0%,
		100% {
			text-shadow:
				0 0 6px currentColor,
				0 0 14px currentColor,
				0 0 24px currentColor;
		}
		50% {
			text-shadow:
				0 0 14px currentColor,
				0 0 32px currentColor,
				0 0 52px currentColor;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-rating__value {
			animation: none;
		}
	}
</style>
