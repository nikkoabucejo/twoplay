<script lang="ts">
	import { DropdownMenu as DropdownPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/style";
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
			"data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit min-w-32 origin-(--bits-dropdown-menu-content-transform-origin) rounded-xl border bg-muted/40 p-1.5 text-popover-foreground shadow-md backdrop-blur-sm outline-none",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</DropdownPrimitive.Content>
</DropdownPortal>
