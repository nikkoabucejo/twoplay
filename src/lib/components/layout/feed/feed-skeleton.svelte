<script lang="ts" module>
	export type FeedSkeletonProps = {
		rows?: number;
		label?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { Skeleton } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";

	let { rows = 5, label = "Loading", class: className }: FeedSkeletonProps = $props();
</script>

<!-- Takes Feed's box, and each row takes Tile's box, so the loaded list replaces it in place. -->
<div role="status" class={cn("min-h-0 w-full max-w-md flex-1 overflow-hidden", className)}>
	<span class="sr-only">{label}</span>
	<ul class="flex flex-col gap-2 py-1" aria-hidden="true">
		{#each { length: rows }, index (index)}
			<li class="flex items-center gap-2 rounded-xl border bg-muted/40 p-3">
				<Skeleton class="size-8 shrink-0 rounded-full" />
				<div class="flex flex-1 flex-col gap-2">
					<Skeleton class="h-3 w-24" />
					<Skeleton class="h-3 w-40 max-w-full" />
				</div>
			</li>
		{/each}
	</ul>
</div>
