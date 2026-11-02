<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";
	import type { WithoutChildrenOrChild } from "$lib/types";
	import { cn } from "$lib/utils/style";

	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = "horizontal",
		class: className,
		thumbLabel,
		...restProps
	}: WithoutChildrenOrChild<SliderPrimitive.RootProps> & {
		/** Accessible name for the thumb, which carries the `slider` role. */
		thumbLabel?: string;
	} = $props();
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
	bind:ref
	bind:value={value as never}
	data-slot="slider"
	{orientation}
	thumbPositioning="exact"
	class={cn(
		"data-[orientation=vertical]:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
		className
	)}
	{...restProps}
>
	{#snippet children({ thumbItems })}
		<span
			data-slot="slider-track"
			data-orientation={orientation}
			class={cn(
				"bg-muted rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5 relative grow overflow-hidden data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full"
			)}
		>
			<SliderPrimitive.Range
				data-slot="slider-range"
				class={cn(
					"bg-primary absolute select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
				)}
			/>
		</span>
		<!-- Inset by half the thumb so it stays on the track; bits-ui's measured containment moved it after load. -->
		<span
			data-orientation={orientation}
			class="absolute flex items-center justify-center data-[orientation=horizontal]:inset-x-2 data-[orientation=horizontal]:inset-y-0 data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:inset-y-2 data-[orientation=vertical]:flex-col"
		>
			{#each thumbItems as thumb (thumb.index)}
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					index={thumb.index}
					aria-label={thumbLabel}
					class="border-primary ring-ring/50 size-4 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
				/>
			{/each}
		</span>
	{/snippet}
</SliderPrimitive.Root>
