<script lang="ts">
	import { Tictactoe } from "$lib/features/play";
	import type { PageProps } from "./$types.js";

	let { params }: PageProps = $props();
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
	<Tictactoe roomCode={params.code} />
</div>
