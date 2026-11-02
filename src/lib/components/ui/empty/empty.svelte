<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type EmptyProps = {
		title: string;
		description: string;
		action?: Snippet;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils/style";

	let { title, description, action, class: className }: EmptyProps = $props();
</script>

<div
	data-slot="empty"
	class={cn("flex flex-col items-center gap-1 px-4 py-10 text-center", className)}
>
	<p class="font-medium">{title}</p>
	<p class="text-sm text-muted-foreground">{description}</p>
	{#if action}
		<div class="mt-3">{@render action()}</div>
	{/if}
</div>
