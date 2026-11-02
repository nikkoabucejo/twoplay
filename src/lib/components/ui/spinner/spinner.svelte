<script lang="ts" module>
	import { LoaderCircle } from "@lucide/svelte";
	import { cn, tv } from "$lib/utils/style";
	import type { VariantProps } from "tailwind-variants";

	export const spinnerVariants = tv({
		base: "animate-spin text-muted-foreground",
		variants: {
			size: {
				sm: "size-4",
				default: "size-6",
				lg: "size-8"
			}
		},
		defaultVariants: {
			size: "default"
		}
	});

	export type SpinnerSize = VariantProps<typeof spinnerVariants>["size"];

	export type SpinnerProps = {
		size?: SpinnerSize;
		label?: string;
		class?: string;
	};
</script>

<script lang="ts">
	let { size = "default", label = "Loading", class: className }: SpinnerProps = $props();
	const labelId = $props.id();
</script>

<span role="status" aria-labelledby={labelId} class="inline-flex">
	<LoaderCircle
		data-slot="spinner"
		aria-hidden="true"
		class={cn(spinnerVariants({ size }), className)}
	/>
	<span id={labelId} class="sr-only">{label}</span>
</span>
