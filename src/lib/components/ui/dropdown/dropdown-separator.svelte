<script lang="ts">
	import { DropdownMenu as DropdownPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/style";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DropdownPrimitive.SeparatorProps = $props();
</script>

<DropdownPrimitive.Separator
	bind:ref
	data-slot="dropdown-separator"
	class={cn("my-1 h-px w-full bg-border/60", className)}
	{...restProps}
/>
