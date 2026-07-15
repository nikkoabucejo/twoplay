<script lang="ts">
	import { DropdownMenu as DropdownPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/style";

	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		...restProps
	}: DropdownPrimitive.ItemProps & {
		/** "destructive" tints the item and its highlighted state red, for a choice like Abandon. */
		variant?: "default" | "destructive";
	} = $props();
</script>

<DropdownPrimitive.Item
	bind:ref
	data-slot="dropdown-item"
	data-variant={variant}
	class={cn(
		"flex cursor-default items-center justify-center rounded-lg px-2 py-1.5 text-center text-xs font-semibold tracking-wide uppercase outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-background/80 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10",
		className
	)}
	{...restProps}
/>
