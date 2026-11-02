<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { VariantProps } from "tailwind-variants";
	import { tv } from "$lib/utils/style";

	// Overlays below its positioned parent instead of joining the flow, so showing it shifts no layout.
	const bannerVariants = tv({
		base: "absolute inset-x-0 top-full z-40 flex items-center justify-center gap-3 border-b bg-card px-4 py-2 text-sm shadow-md",
		variants: {
			tone: {
				default: "text-foreground",
				error: "border-destructive/30 text-destructive"
			}
		},
		defaultVariants: {
			tone: "default"
		}
	});

	export type BannerTone = VariantProps<typeof bannerVariants>["tone"];

	export type BannerProps = {
		message: string;
		tone?: BannerTone;
		action?: Snippet;
	};
</script>

<script lang="ts">
	let { message, tone = "default", action }: BannerProps = $props();
</script>

<div role="alert" class={bannerVariants({ tone })}>
	<p>{message}</p>
	{@render action?.()}
</div>
