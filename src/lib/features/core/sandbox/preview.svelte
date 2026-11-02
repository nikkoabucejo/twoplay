<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils/style";

	let {
		label,
		children,
		actions,
		isOverlay = false,
		class: className
	}: {
		label: string;
		children: Snippet;
		/** Controls beside the label. */
		actions?: Snippet;
		/** The content is an overlay that fills the box and may glow past it, like a result card. */
		isOverlay?: boolean;
		/** Classes for the box the content fills, which is square unless overridden. */
		class?: string;
	} = $props();

	const captionId = $props.id();
</script>

<figure
	aria-labelledby={captionId}
	class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center overflow-hidden rounded-2xl border bg-muted/30 backdrop-blur-sm"
>
	<div
		data-frame={isOverlay ? "edge" : ""}
		class="col-span-2 min-w-0 border-b bg-background/30 p-4 sm:p-5"
	>
		<!-- min-h-0 stops the content's own height from stretching the square. -->
		<div class={cn("relative aspect-square min-h-0 w-full min-w-0", className)}>
			{@render children()}
		</div>
	</div>
	{#if actions}
		<div class="col-start-2 row-start-2 pr-4">{@render actions()}</div>
	{/if}
	<figcaption
		id={captionId}
		class="col-start-1 row-start-2 flex h-12 min-w-0 items-center px-4 text-sm font-medium whitespace-nowrap"
	>
		{label}
	</figcaption>
</figure>
