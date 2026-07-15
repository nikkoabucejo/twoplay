<script lang="ts">
	import { DropdownMenu as DropdownPrimitive } from "bits-ui";
	import { buttonVariants, type ButtonSize, type ButtonVariant } from "../button/index.js";
	import { cn } from "$lib/utils/style";

	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		size = "default",
		...restProps
	}: DropdownPrimitive.TriggerProps & {
		/** Renders the trigger with the exact look of `Button` in this variant/size — a dropdown
		 *  standing in for a button should never visually diverge from the button it replaces. */
		variant?: ButtonVariant;
		size?: ButtonSize;
	} = $props();
</script>

<DropdownPrimitive.Trigger
	bind:ref
	data-slot="dropdown-trigger"
	class={cn(buttonVariants({ variant, size }), className)}
	{...restProps}
/>
