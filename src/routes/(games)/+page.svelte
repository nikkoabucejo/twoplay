<script lang="ts">
	import { Crown, Grid3x3 } from "@lucide/svelte";
	import { Button } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";

	const auth = getClerkAuth();

	const games = [
		{ href: "/tictactoe", name: "Tic-Tac-Toe", icon: Grid3x3 },
		{ href: "/checkers", name: "Checkers", icon: Crown }
	];
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-8 text-center">
	<div class="flex flex-col items-center gap-2">
		<h1 class="text-3xl font-bold tracking-tight">twoplay</h1>
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
