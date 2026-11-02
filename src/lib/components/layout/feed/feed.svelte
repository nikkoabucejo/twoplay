<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type FeedProps = {
		class?: string;
		children: Snippet;
	};
</script>

<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import { cn } from "$lib/utils/style";
	import { feedEdges, type FeedEdges } from "./edges.js";

	let { class: className, children }: FeedProps = $props();

	let edges = $state<FeedEdges>({ top: false, bottom: false });

	function measure(element: HTMLElement) {
		edges = feedEdges(element);
	}

	// Watches the children too: a list growing inside the feed changes `scrollHeight` without
	// resizing the feed itself.
	const trackEdges: Attachment<HTMLElement> = (element) => {
		measure(element);
		const observer = new ResizeObserver(() => measure(element));
		observer.observe(element);
		for (const child of element.children) observer.observe(child);
		return () => observer.disconnect();
	};
</script>

<div
	{@attach trackEdges}
	onscroll={(event) => measure(event.currentTarget)}
	class={cn(
		"no-scrollbar min-h-0 w-full max-w-md flex-1 overflow-y-auto",
		edges.top &&
			edges.bottom &&
			"mask-[linear-gradient(to_bottom,transparent,black_1.5rem,black_calc(100%_-_1.5rem),transparent)]",
		edges.top && !edges.bottom && "mask-[linear-gradient(to_bottom,transparent,black_1.5rem)]",
		!edges.top && edges.bottom && "mask-[linear-gradient(to_top,transparent,black_1.5rem)]",
		className
	)}
>
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
