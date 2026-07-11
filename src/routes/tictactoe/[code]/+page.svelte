<script lang="ts">
	import { Header } from "$lib/components/layout";
	import { Tictactoe } from "$lib/features/play";
	import type { PageProps } from "./$types.js";

	let { params }: PageProps = $props();
</script>

<div class="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-8 text-center">
	<Header />
	<Tictactoe roomCode={params.code} />
</div>
