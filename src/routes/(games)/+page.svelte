<script lang="ts">
	import { CheckersIcon, TictactoeIcon } from "$lib/assets/icons/games";
	import { Button, Sparkle } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";

	const auth = getClerkAuth();

	const games = [
		{ href: "/tictactoe", name: "Tic-Tac-Toe", icon: TictactoeIcon },
		{ href: "/checkers", name: "Checkers", icon: CheckersIcon }
	];
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-8 text-center">
	<div class="flex flex-col items-center gap-2">
		<div class="relative">
			<Sparkle colors={["#06b6d4", "#ec4899"]} class="-inset-x-8 -inset-y-4 -z-10" />
			<h1 class="text-3xl font-bold tracking-tight">
				<span class="title-player1">TWO</span><span class="title-player2">PLAY</span>
			</h1>
		</div>
		<p class="text-muted-foreground">Pick a game to create or join a room.</p>
	</div>

	{#if !auth.isSignedIn}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Sign in to start playing.</p>
			<Button onclick={() => auth.signIn()}>Sign in</Button>
		</div>
	{:else}
		<div class="flex items-center justify-center gap-12">
			{#each games as game (game.href)}
				{@const Icon = game.icon}
				<a
					href={game.href}
					class="flex flex-col items-center gap-2 text-foreground transition-opacity hover:opacity-70 active:opacity-50"
				>
					<Icon class="size-10" />
					<span class="font-semibold">{game.name}</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* "TWO" mirrors player 1's accent and "PLAY" mirrors player 2's (see $lib/utils/style/accents) —
	   the wordmark itself echoes the app's two-player duality instead of an arbitrary gradient. */
	.title-player1 {
		color: #06b6d4;
		animation: glow-pulse-player1 3s ease-in-out infinite;
	}

	@keyframes glow-pulse-player1 {
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

	.title-player2 {
		color: #ec4899;
		animation: glow-pulse-player2 3s ease-in-out infinite;
	}

	@keyframes glow-pulse-player2 {
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
