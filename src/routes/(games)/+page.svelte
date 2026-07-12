<script lang="ts">
	import { Checkers, TicTacToe } from "$lib/assets/icons/games";
	import { Button } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";

	const auth = getClerkAuth();

	const games = [
		{ href: "/tictactoe", name: "Tic-Tac-Toe", icon: TicTacToe },
		{ href: "/checkers", name: "Checkers", icon: Checkers }
	];
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-8 text-center">
	<div class="flex flex-col items-center gap-2">
		<h1 class="text-3xl font-bold tracking-tight"><span class="gradient-title">TWO</span><span
				class="glow-title">PLAY</span
			></h1>
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
	.gradient-title {
		animation:
			color-shift 10s ease-in-out infinite,
			glow-pulse-color 3s ease-in-out infinite;
	}

	@keyframes color-shift {
		0%,
		100% {
			color: #00e5ff;
		}
		50% {
			color: #ff0080;
		}
	}

	@keyframes glow-pulse-color {
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

	.glow-title {
		color: #fff;
		animation: glow-pulse 3s ease-in-out infinite;
	}

	@keyframes glow-pulse {
		0%,
		100% {
			text-shadow:
				0 0 4px #fff,
				0 0 10px #fff,
				0 0 18px currentColor;
		}
		50% {
			text-shadow:
				0 0 8px #fff,
				0 0 20px #fff,
				0 0 32px currentColor;
		}
	}
</style>
