<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type TileProps = {
		/** True to give the card the "this is you/your live room" emerald treatment. */
		highlighted?: boolean;
		icon: Snippet;
		title: Snippet;
		subtitle: Snippet;
		/** Rendered at the end of the header row — e.g. a Join/View button or the room code. */
		trailing?: Snippet;
		/** Extra content below the header row — e.g. a room's list of past games. */
		children?: Snippet;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils/style";

	let {
		highlighted = false,
		icon,
		title,
		subtitle,
		trailing,
		children,
		class: className
	}: TileProps = $props();
</script>

<li
	class={cn(
		"flex flex-col gap-2 rounded-xl border p-3 backdrop-blur-sm",
		highlighted ? "border-emerald-500/40 bg-emerald-500/10" : "bg-muted/40",
		className
	)}
>
	<div class="flex items-center gap-2">
		{@render icon()}
		<div class="flex min-w-0 flex-1 flex-col">
			{@render title()}
			{@render subtitle()}
		</div>
		{#if trailing}
			{@render trailing()}
		{/if}
	</div>

	{#if children}
		{@render children()}
	{/if}
</li>
