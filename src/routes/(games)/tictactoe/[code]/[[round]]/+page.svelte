<script lang="ts">
	import { Meta } from "$lib/components/ui";
	import { GAMES, Tictactoe } from "$lib/features/play";
	import type { PageProps } from "./$types.js";

	let { params }: PageProps = $props();
	// A malformed round segment (non-numeric, negative, fractional) should fall back to "live"
	// rather than be forwarded to Convex as-is — an invalid number there just looks like a missing room.
	const round = $derived(
		params.round && /^[1-9]\d*$/.test(params.round) ? Number(params.round) : undefined
	);
</script>

<Meta title={GAMES.tictactoe.name} description="A live game of Tic-Tac-Toe on twoplay." />

<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-3 py-4 text-center">
	<Tictactoe roomCode={params.code} {round} />
</div>
