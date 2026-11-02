<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { Emblem, Empty, Gate, Skeleton } from "$lib/components/ui";
	import { GAMES, GAME_TYPES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { rankOf, recentRounds, recordByGame, type RecentRound } from "./stats.js";
	import { api } from "../../../../../convex/_generated/api.js";

	const RECENT_LIMIT = 10;

	const RESULT_LABELS: Record<RecentRound["result"], string> = {
		win: "Win",
		loss: "Loss",
		draw: "Draw",
		playing: "Playing"
	};

	// Same verdict colors as History, not the seat colors.
	const RESULT_CLASSES: Record<RecentRound["result"], string> = {
		win: "text-emerald-500",
		loss: "text-destructive",
		draw: "text-muted-foreground",
		playing: "text-amber-500"
	};

	const TILE_CLASS = "flex flex-col gap-1 rounded-xl border bg-muted/40 p-3 backdrop-blur-sm";

	const auth = getClerkAuth();
	const rating = useQuery(api.models.ratings.index.mine, () => (auth.isSignedIn ? {} : "skip"));
	const top = useQuery(api.models.ratings.index.top, () => (auth.isSignedIn ? {} : "skip"));
	const totals = useQuery(api.models.rooms.index.stats, () => (auth.isSignedIn ? {} : "skip"));
	const history = useQuery(api.models.rooms.index.history, () => (auth.isSignedIn ? {} : "skip"));

	const rank = $derived(top.data ? rankOf(top.data) : null);
	const records = $derived(history.data ? recordByGame(history.data) : null);
	const rounds = $derived(history.data ? recentRounds(history.data, RECENT_LIMIT) : null);
	const isLoading = $derived(
		rating.isLoading || top.isLoading || totals.isLoading || history.isLoading
	);
	const hasError = $derived(Boolean(rating.error || top.error || totals.error || history.error));

	/** A floor-clamped loss settles at 0, which shows as "0" rather than "-0". */
	function signed(mmr: number) {
		if (mmr > 0) return `+${mmr}`;
		if (mmr < 0) return `−${Math.abs(mmr)}`;
		return "0";
	}

	function formatDate(createdAt: number) {
		return new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
	}
</script>

{#snippet statTile(label: string, value: string)}
	<div class={TILE_CLASS}>
		<span class="font-mono text-2xl font-bold tabular-nums">{value}</span>
		<span class="text-caption text-muted-foreground">{label}</span>
	</div>
{/snippet}

<div class="flex w-full flex-col gap-6">
	{#if !auth.isSignedIn}
		<Gate message="Sign in to see your stats." class="py-10" />
	{:else if hasError}
		<p class="text-sm text-destructive">Could not load your stats.</p>
	{:else if isLoading || !records || !rounds}
		<div aria-hidden="true" class="flex flex-col gap-6">
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{#each { length: 4 } as _, index (index)}
					<div class={TILE_CLASS}>
						<Skeleton class="h-8 w-16" />
						<Skeleton class="h-3.5 w-12" />
					</div>
				{/each}
			</div>
			<div class="flex flex-col gap-2">
				<Skeleton class="h-4 w-20" />
				{#each GAME_TYPES as type (type)}
					<Skeleton class="h-14 w-full rounded-xl" />
				{/each}
			</div>
		</div>
	{:else}
		<section aria-label="Overview" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{@render statTile("Rating", String(rating.data))}
			{@render statTile("Rank", rank === null ? "Unranked" : `#${rank}`)}
			{@render statTile("Games", String(totals.data?.totalGames))}
			{@render statTile("Win rate", `${totals.data?.winRate}%`)}
		</section>

		<section class="flex flex-col gap-2">
			<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">By game</h2>
			<ul class="flex flex-col gap-2">
				{#each GAME_TYPES as type (type)}
					{@const record = records[type]}
					<li class="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 backdrop-blur-sm">
						<Emblem
							icon={GAMES[type].icon}
							colors={GAMES[type].colors}
							class="size-8 shrink-0"
							sparkles={false}
						/>
						<span class="min-w-0 flex-1 truncate text-sm font-semibold">{GAMES[type].name}</span>
						<dl class="flex shrink-0 gap-3 text-right">
							<div class="flex w-10 flex-col-reverse">
								<dt class="text-caption text-muted-foreground">Wins</dt>
								<dd class="font-mono text-sm font-semibold tabular-nums">{record.wins}</dd>
							</div>
							<div class="flex w-10 flex-col-reverse">
								<dt class="text-caption text-muted-foreground">Losses</dt>
								<dd class="font-mono text-sm font-semibold tabular-nums">{record.losses}</dd>
							</div>
							<div class="flex w-10 flex-col-reverse">
								<dt class="text-caption text-muted-foreground">Draws</dt>
								<dd class="font-mono text-sm font-semibold tabular-nums">{record.draws}</dd>
							</div>
						</dl>
					</li>
				{/each}
			</ul>
		</section>

		<section class="flex flex-col gap-2">
			<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				Recent games
			</h2>
			{#if rounds.length}
				<ul class="flex flex-col gap-2">
					{#each rounds as round (round.href)}
						<li>
							<a
								href={round.href}
								class="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 backdrop-blur-sm transition-colors outline-none hover:border-foreground/20 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
							>
								<Emblem
									icon={GAMES[round.type].icon}
									colors={GAMES[round.type].colors}
									class="size-8 shrink-0"
									sparkles={false}
								/>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate text-xs font-semibold">
										{GAMES[round.type].name} · Game {round.round}
									</span>
									<span class="truncate text-caption text-muted-foreground">
										vs {round.opponentName ?? "no opponent"} · {formatDate(round.createdAt)}
									</span>
								</span>
								<span
									class={cn(
										"w-14 shrink-0 text-right text-caption font-semibold tracking-wide uppercase",
										RESULT_CLASSES[round.result]
									)}
								>
									{RESULT_LABELS[round.result]}
								</span>
								<span
									class={cn(
										"w-8 shrink-0 text-right font-mono text-caption font-semibold tabular-nums",
										(round.mmr === null || round.mmr === 0) && "text-muted-foreground",
										round.mmr !== null && round.mmr > 0 && "text-emerald-500",
										round.mmr !== null && round.mmr < 0 && "text-destructive"
									)}
								>
									{round.mmr === null ? "—" : signed(round.mmr)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<Empty
					title="No games yet"
					description="Games you finish show up here."
					class="rounded-xl border bg-muted/40"
				/>
			{/if}
		</section>
	{/if}
</div>
