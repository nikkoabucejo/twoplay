<script lang="ts" module>
	import { tv } from "$lib/utils/style";

	export const dropdownItemVariants = tv({
		base: "flex h-9 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-colors",
		variants: {
			variant: {
				default:
					"text-foreground/85 data-highlighted:bg-linear-to-r data-highlighted:from-seat-0/15 data-highlighted:to-seat-1/10 data-highlighted:text-foreground [&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-seat-0",
				destructive:
					"text-destructive focus-visible:ring-destructive/40 data-highlighted:bg-destructive/12 [&_svg]:text-destructive"
			}
		},
		defaultVariants: { variant: "default" }
	});
</script>

<script lang="ts">
	import { DropdownMenu as DropdownPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/style";

	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		...restProps
	}: DropdownPrimitive.ItemProps & {
		/** "destructive" tints the item and its highlighted state red, for a choice like Sign out. */
		variant?: "default" | "destructive";
	} = $props();
</script>

<DropdownPrimitive.Item
	bind:ref
	data-slot="dropdown-item"
	data-variant={variant}
	class={cn(dropdownItemVariants({ variant }), className)}
	{...restProps}
/>
