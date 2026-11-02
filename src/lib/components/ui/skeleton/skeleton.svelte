<script lang="ts">
	import type { WithElementRef, WithoutChildren } from "$lib/types";
	import { cn } from "$lib/utils/style";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="skeleton"
	aria-hidden="true"
	class={cn("rounded-md bg-muted motion-safe:animate-pulse", className)}
	{...restProps}
></div>
