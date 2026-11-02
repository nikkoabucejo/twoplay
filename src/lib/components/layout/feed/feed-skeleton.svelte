<script lang="ts" module>
	import type { HTMLAttributes } from "svelte/elements";

	export type FeedSkeletonProps = HTMLAttributes<HTMLDivElement> & {
		rows?: number;
		label?: string;
	};
</script>

<script lang="ts">
	import { Skeleton } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";

	let { rows = 5, label = "Loading", class: className, ...restProps }: FeedSkeletonProps = $props();
</script>

<!-- Takes Feed's box, and each row takes Tile's header row (icon, title over subtitle, trailing
     action), so the loaded list replaces it in place. -->
<div
	role="status"
	class={cn("min-h-0 w-full max-w-2xl flex-1 overflow-hidden", className)}
	{...restProps}
>
	<span class="sr-only">{label}</span>
	<ul class="flex flex-col gap-2 py-1" aria-hidden="true">
		{#each { length: rows }, index (index)}
			<li class="flex items-center gap-2 rounded-xl border bg-muted/40 p-3 backdrop-blur-sm">
				<Skeleton class="size-8 shrink-0 rounded-full" />
				<div class="flex min-w-0 flex-1 flex-col">
					<Skeleton variant="text" class="h-4 w-24" />
					<Skeleton variant="text" class="h-4 w-40 max-w-full" />
				</div>
				<Skeleton class="h-6 w-11 shrink-0" />
			</li>
		{/each}
	</ul>
</div>
