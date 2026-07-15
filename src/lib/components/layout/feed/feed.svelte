<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type FeedProps = {
		class?: string;
		children: Snippet;
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils/style";

	let { class: className, children }: FeedProps = $props();
</script>

<div class={cn("no-scrollbar min-h-0 w-full max-w-md flex-1 overflow-y-auto", className)}>
	{@render children()}
</div>

<style>
	.no-scrollbar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
