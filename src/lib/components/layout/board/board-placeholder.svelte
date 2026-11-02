<script lang="ts">
	import { Skeleton } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import { BOARD_CHROME, BOARD_SIZE } from "./board.svelte";

	let { class: className }: { class?: string } = $props();
</script>

{#snippet strip()}
	<!-- A player strip: emoji box, name over status line, clock. -->
	<div
		class="flex h-14 w-(--board-size) items-center gap-2 rounded-lg border bg-muted/40 px-2 backdrop-blur-sm"
	>
		<Skeleton class="size-10 shrink-0" />
		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<Skeleton variant="text" class="h-5 w-20" />
			<Skeleton variant="text" class="h-4 w-14" />
		</div>
		<Skeleton class="h-10 w-16 shrink-0 sm:w-20" />
	</div>
{/snippet}

<!-- Mirrors Board's box so the loaded board replaces it without moving anything: below lg the room
     bar, strip, square area, strip, controls row, and notice line; from lg the strips and square
     area beside the side panel. -->
<div
	role="status"
	data-loading="board"
	class={cn("mx-auto flex w-fit items-stretch gap-4", BOARD_CHROME, className)}
	style:--board-size={BOARD_SIZE}
>
	<span class="sr-only">Loading game</span>
	<div class="flex flex-col items-center gap-2" aria-hidden="true">
		<div data-slot="room-bar" class="flex h-8 w-(--board-size) items-center gap-1.5 lg:hidden">
			<Skeleton class="size-4 shrink-0" />
			<Skeleton variant="text" class="h-4 w-12" />
			<Skeleton class="ml-auto h-8 w-40" />
		</div>

		{@render strip()}

		<div data-slot="board-area" class="aspect-square w-(--board-size)">
			<Skeleton class="size-full rounded-lg" />
		</div>

		{@render strip()}

		<div data-slot="footer" class="flex w-(--board-size) flex-col items-center gap-2 lg:hidden">
			<div class="flex h-8 w-full justify-center">
				<Skeleton class="h-8 w-28 sm:w-32" />
			</div>
			<div class="h-5"></div>
		</div>
	</div>

	<div
		data-slot="side-panel"
		class="hidden w-72 shrink-0 flex-col gap-3 rounded-lg border bg-muted/40 p-3 backdrop-blur-sm lg:flex"
		aria-hidden="true"
	>
		<div class="flex h-8 items-center gap-1.5">
			<Skeleton class="size-4 shrink-0" />
			<Skeleton variant="text" class="h-5 w-24" />
			<Skeleton variant="text" class="h-4 w-12" />
		</div>
		<div class="flex flex-col gap-1.5">
			<Skeleton variant="text" class="h-4 w-14" />
			<Skeleton class="h-8 w-full" />
		</div>
	</div>
</div>
