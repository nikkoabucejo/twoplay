<script lang="ts" module>
	import type { WithElementRef, WithoutChildren } from "$lib/types";
	import { tv } from "$lib/utils/style";
	import type { HTMLAttributes } from "svelte/elements";
	import type { VariantProps } from "tailwind-variants";

	export const skeletonVariants = tv({
		base: "rounded-md bg-muted motion-safe:animate-pulse",
		variants: {
			variant: {
				block: "",
				// Sized to the text's line box (h-4 for text-xs, h-5 for text-sm…) so it takes the same
				// space as the text, but painted as a thinner bar inside it.
				text: "bg-clip-content py-0.5"
			}
		},
		defaultVariants: {
			variant: "block"
		}
	});

	export type SkeletonVariant = VariantProps<typeof skeletonVariants>["variant"];

	export type SkeletonProps = WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> & {
		variant?: SkeletonVariant;
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils/style";

	let {
		ref = $bindable(null),
		variant = "block",
		class: className,
		...restProps
	}: SkeletonProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="skeleton"
	aria-hidden="true"
	class={cn(skeletonVariants({ variant }), className)}
	{...restProps}
></div>
