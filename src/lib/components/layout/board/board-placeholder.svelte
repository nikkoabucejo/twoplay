<script lang="ts">
	import { Spinner } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import { BOARD_SIZE } from "./board.svelte";

	let {
		size = BOARD_SIZE,
		class: className
	}: {
		/** Side length of the square board area. Match the `Board` it stands in for. */
		size?: string;
		class?: string;
	} = $props();
</script>

<!-- Mirrors Board's box (strip, square area, strip, controls row, round line, error slot) so the
     loaded board replaces it without moving anything. -->
<div
	class={cn("mx-auto flex w-fit flex-col items-center gap-2", className)}
	style:--board-size={size}
>
	<div class="h-14 w-(--board-size) rounded-lg border bg-muted/40" aria-hidden="true"></div>

	<div class="flex aspect-square w-(--board-size) items-center justify-center">
		<Spinner size="lg" label="Loading game" />
	</div>

	<div class="h-14 w-(--board-size) rounded-lg border bg-muted/40" aria-hidden="true"></div>

	<div
		data-slot="footer"
		class="flex w-(--board-size) flex-col items-center gap-2"
		aria-hidden="true"
	>
		<div class="h-8 w-full"></div>
		<div class="h-4"></div>
		<div class="h-5"></div>
	</div>
</div>
