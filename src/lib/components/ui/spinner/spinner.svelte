<script lang="ts" module>
	import { LoaderCircle } from "@lucide/svelte";
	import { cn } from "$lib/utils/style";
	import { type VariantProps, tv } from "tailwind-variants";

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
		class?: string;
	};
</script>

<script lang="ts">
	let { size = "default", class: className }: SpinnerProps = $props();
</script>

<LoaderCircle data-slot="spinner" class={cn(spinnerVariants({ size }), className)} />
