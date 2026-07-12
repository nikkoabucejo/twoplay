<script lang="ts">
	import { Tictactoe } from "$lib/features/play";
	import type { PageProps } from "./$types.js";

	let { params }: PageProps = $props();
	// A malformed round segment (non-numeric, negative, fractional) should fall back to "live"
	// rather than be forwarded to Convex as-is — an invalid number there just looks like a missing room.
	const round = $derived(
		params.round && /^[1-9]\d*$/.test(params.round) ? Number(params.round) : undefined
	);
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
	<Tictactoe roomCode={params.code} {round} />
</div>
