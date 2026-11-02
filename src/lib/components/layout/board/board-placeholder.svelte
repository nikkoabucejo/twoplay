<script lang="ts">
	import { Spinner } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import { BOARD_CHROME, BOARD_SIZE } from "./board.svelte";

	let { class: className }: { class?: string } = $props();
</script>

<!-- Mirrors Board's box so the loaded board replaces it without moving anything: below lg the room
     bar, strip, square area, strip, controls row, and notice line; from lg the strips and square
     area beside the side panel. -->
<div
	class={cn("mx-auto flex w-fit items-stretch gap-4", BOARD_CHROME, className)}
	style:--board-size={BOARD_SIZE}
>
	<div class="flex flex-col items-center gap-2">
		<div data-slot="room-bar" class="h-8 w-(--board-size) lg:hidden" aria-hidden="true"></div>

		<div
			class="h-14 w-(--board-size) rounded-lg border bg-muted/40 backdrop-blur-sm"
			aria-hidden="true"
		></div>

		<div class="flex aspect-square w-(--board-size) items-center justify-center">
			<Spinner size="lg" label="Loading game" />
		</div>

		<div
			class="h-14 w-(--board-size) rounded-lg border bg-muted/40 backdrop-blur-sm"
			aria-hidden="true"
		></div>

		<div
			data-slot="footer"
			class="flex w-(--board-size) flex-col items-center gap-2 lg:hidden"
			aria-hidden="true"
		>
			<div class="h-8 w-full"></div>
			<div class="h-5"></div>
		</div>
	</div>

	<div
		data-slot="side-panel"
		class="hidden w-72 shrink-0 rounded-lg border bg-muted/40 backdrop-blur-sm lg:block"
		aria-hidden="true"
	></div>
</div>
