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
	class={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
	{...restProps}
/>
