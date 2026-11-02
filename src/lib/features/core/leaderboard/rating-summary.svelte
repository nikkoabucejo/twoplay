<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { Trophy } from "@lucide/svelte";
	import { Skeleton, Sparkle } from "$lib/components/ui";
	import { SEAT_COLORS } from "$lib/utils/style";
	import { rankStatus } from "./standings.js";
	import { api } from "../../../../../convex/_generated/api.js";

	// Shared with the loading skeleton so the loaded card replaces it in the same box.
	const RATING_CARD_CLASS =
		"relative w-full shrink-0 overflow-hidden rounded-2xl border bg-muted/40 p-6 text-center backdrop-blur-sm";

	const leaderboard = useQuery(api.models.ratings.index.top, {});
	const myRating = useQuery(api.models.ratings.index.mine, {});
	const myStats = useQuery(api.models.rooms.index.stats, {});

	const myRankIndex = $derived(leaderboard.data?.findIndex((entry) => entry.isMe) ?? -1);
</script>

{#if leaderboard.isLoading || myRating.isLoading || myStats.isLoading}
	<div data-slot="rating-card-skeleton" class={RATING_CARD_CLASS} aria-hidden="true">
		<div class="flex flex-col items-center gap-1.5">
			<Skeleton class="h-4 w-24" />
			<Skeleton class="h-10 w-20" />
			<Skeleton class="h-4 w-32" />

			<div class="mt-2 flex items-center gap-4 border-t border-border/60 pt-3">
				<div class="flex flex-col items-center gap-0.5">
					<Skeleton class="h-5 w-6" />
					<Skeleton class="h-4 w-10" />
				</div>
				<div class="h-6 w-px bg-border"></div>
				<div class="flex flex-col items-center gap-0.5">
					<Skeleton class="h-5 w-8" />
					<Skeleton class="h-4 w-12" />
				</div>
			</div>
		</div>
	</div>
{:else if leaderboard.data && myRating.data !== undefined && myStats.data}
	<div class={RATING_CARD_CLASS}>
		<Sparkle colors={SEAT_COLORS} variant="title" class="opacity-70" />
		<div class="relative z-10 flex flex-col items-center gap-1.5">
			<h2
				class="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				<Trophy class="size-3.5" aria-hidden="true" />
				Your rating
			</h2>
			<span class="hero-rating__value font-mono text-4xl font-bold tabular-nums">
				{myRating.data}
			</span>
			<span class="text-xs text-muted-foreground">
				{rankStatus({
					rank: myRankIndex >= 0 ? myRankIndex + 1 : null,
					totalGames: myStats.data.totalGames,
					listLength: leaderboard.data.length
				})}
			</span>

			<div class="mt-2 flex items-center gap-4 border-t border-border/60 pt-3">
				<div class="flex flex-col items-center gap-0.5">
					<span class="font-mono text-sm font-semibold tabular-nums">
						{myStats.data.totalGames}
					</span>
					<span class="text-caption text-muted-foreground">Games</span>
				</div>
				<div class="h-6 w-px bg-border"></div>
				<div class="flex flex-col items-center gap-0.5">
					<span class="font-mono text-sm font-semibold tabular-nums">
						{myStats.data.winRate}%
					</span>
					<span class="text-caption text-muted-foreground">Win rate</span>
				</div>
			</div>
		</div>
	</div>
{:else}
	<p class="text-sm text-destructive">Could not load your rating.</p>
{/if}

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
