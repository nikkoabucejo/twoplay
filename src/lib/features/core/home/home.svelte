<script lang="ts">
	import { Sparkle } from "$lib/components/ui";
	import { GAME_TYPES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { SEAT_COLORS } from "$lib/utils/style";
	import GameCard from "./game-card.svelte";
	import Steps from "./steps.svelte";

	const auth = getClerkAuth();
</script>

<div class="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
	<div class="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
		<div class="relative">
			<Sparkle colors={SEAT_COLORS} class="-inset-x-8 -inset-y-4 -z-10" />
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
				<span class="title-player1">TWO</span><span class="title-player2">PLAY</span>
			</h1>
		</div>
		<div class="flex flex-col gap-1">
			<p class="text-lg font-medium">Real-time two-player games.</p>
			<p class="text-muted-foreground">
				Match with a stranger or send a friend a code. Moves land live.
			</p>
		</div>
	</div>

	<ul aria-label="Games" class="flex flex-col gap-3">
		{#each GAME_TYPES as type (type)}
			<GameCard {type} />
		{/each}
	</ul>

	{#if !auth.isSignedIn}
		<Steps class="lg:col-span-2" />
	{/if}
</div>

<style>
	/* "TWO" mirrors player 1's accent and "PLAY" mirrors player 2's (see $lib/utils/style/accents) —
	   the wordmark itself echoes the app's two-player duality instead of an arbitrary gradient. */
	.title-player1 {
		color: var(--seat-0);
	}

	.title-player2 {
		color: var(--seat-1);
	}

	.title-player1,
	.title-player2 {
		text-shadow:
			0 0 4px currentColor,
			0 0 10px currentColor,
			0 0 18px currentColor;
	}

	@media (prefers-reduced-motion: no-preference) {
		.title-player1,
		.title-player2 {
			animation: glow-pulse 3s ease-in-out infinite;
		}
	}

	@keyframes glow-pulse {
		0%,
		100% {
			text-shadow:
				0 0 4px currentColor,
				0 0 10px currentColor,
				0 0 18px currentColor;
		}
		50% {
			text-shadow:
				0 0 8px currentColor,
				0 0 20px currentColor,
				0 0 32px currentColor;
		}
	}
</style>
