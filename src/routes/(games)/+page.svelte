<script lang="ts">
	import { Button, Emblem, Meta, Sparkle } from "$lib/components/ui";
	import { GAMES, GAME_TYPES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { SITE_DESCRIPTION, landingJsonLd } from "$lib/utils/seo";
	import { SEAT_COLORS } from "$lib/utils/style";

	const auth = getClerkAuth();
</script>

<Meta description={SITE_DESCRIPTION} jsonLd={landingJsonLd()} />

<div
	class="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-6 text-center sm:gap-10 sm:py-8"
>
	<div class="flex flex-col items-center gap-2">
		<div class="relative">
			<Sparkle colors={SEAT_COLORS} class="-inset-x-8 -inset-y-4 -z-10" />
			<h1 class="text-3xl font-bold tracking-tight">
				<span class="title-player1">TWO</span><span class="title-player2">PLAY</span>
			</h1>
		</div>
		<p class="text-muted-foreground">Real-time two-player games in the browser.</p>
	</div>

	<div class="flex items-center justify-center gap-8 sm:gap-12">
		{#each GAME_TYPES as type (type)}
			<a
				href="/play?game={type}"
				class="flex flex-col items-center gap-1 rounded-md p-1 text-foreground transition-opacity outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring active:opacity-50"
			>
				<Emblem icon={GAMES[type].icon} colors={GAMES[type].colors} class="size-14" />
				<span class="font-semibold">{GAMES[type].name}</span>
			</a>
		{/each}
	</div>

	<!-- Holds its height when signed in, so the picker stays put after sign-in. -->
	<div class="flex min-h-18 flex-col items-center gap-3">
		{#if !auth.isSignedIn}
			<p class="text-muted-foreground">Sign in to start playing.</p>
			<Button disabled={auth.loadError !== null} onclick={() => auth.signIn()}>Sign in</Button>
		{/if}
	</div>
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
