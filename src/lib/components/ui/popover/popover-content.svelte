<script lang="ts">
	import { Popover as PopoverPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/style";
	import PopoverPortal from "./popover-portal.svelte";
	import { floatingMotionClass, surfaceClass } from "./surface.js";
	import type { ComponentProps } from "svelte";
	import type { WithoutChildrenOrChild } from "$lib/types";

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		side = "bottom",
		children,
		portalProps,
		...restProps
	}: PopoverPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof PopoverPortal>>;
	} = $props();
</script>

<PopoverPortal {...portalProps}>
	<PopoverPrimitive.Content
		bind:ref
		data-slot="popover-content"
		{sideOffset}
		{side}
		class={cn(
			surfaceClass,
			floatingMotionClass,
			"z-50 w-fit origin-(--bits-popover-content-transform-origin) p-2 outline-none",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</PopoverPrimitive.Content>
</PopoverPortal>
