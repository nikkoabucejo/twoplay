<script lang="ts">
	import { DropdownMenu as DropdownPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/style";
	import { floatingMotionClass, surfaceClass } from "../popover/index.js";
	import DropdownPortal from "./dropdown-portal.svelte";
	import type { ComponentProps } from "svelte";
	import type { WithoutChildrenOrChild } from "$lib/types";

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 8,
		side = "bottom",
		children,
		portalProps,
		...restProps
	}: DropdownPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DropdownPortal>>;
	} = $props();
</script>

<DropdownPortal {...portalProps}>
	<DropdownPrimitive.Content
		bind:ref
		data-slot="dropdown-content"
		{sideOffset}
		{side}
		class={cn(
			surfaceClass,
			floatingMotionClass,
			"z-50 w-(--bits-dropdown-menu-anchor-width) min-w-44 origin-(--bits-dropdown-menu-content-transform-origin) p-1.5 outline-none",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</DropdownPrimitive.Content>
</DropdownPortal>
