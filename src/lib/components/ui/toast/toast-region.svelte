<script lang="ts" module>
	import { X } from "@lucide/svelte";
	import { cn, tv } from "$lib/utils/style";
	import { Button } from "../button/index.js";
	import type { Toaster } from "./toaster.svelte.js";

	const toastVariants = tv({
		base: "pointer-events-auto flex w-full max-w-sm min-w-0 animate-in items-center gap-2 rounded-xl border bg-popover py-1.5 pr-1.5 pl-3 text-sm shadow-md fade-in-0",
		variants: {
			tone: {
				default: "text-popover-foreground",
				error: "border-destructive/40 text-destructive"
			}
		},
		defaultVariants: {
			tone: "default"
		}
	});

	const regionVariants = tv({
		base: "pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6",
		variants: {
			aboveDock: {
				true: "bottom-[calc(env(safe-area-inset-bottom)+5rem)]",
				false: "bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]"
			}
		},
		defaultVariants: {
			aboveDock: false
		}
	});

	export type ToastRegionProps = {
		toaster: Toaster;
		/** Raises the region below `sm` to clear the bottom `Dock`. */
		aboveDock?: boolean;
		class?: string;
	};
</script>

<script lang="ts">
	let { toaster, aboveDock = false, class: className }: ToastRegionProps = $props();
</script>

<!-- Stays mounted while empty: a live region added together with its first message isn't announced. -->
<div aria-live="polite" class={cn(regionVariants({ aboveDock }), className)}>
	{#each toaster.items as item (item.id)}
		<div data-slot="toast" class={toastVariants({ tone: item.tone })}>
			<p class="min-w-0 flex-1 truncate">{item.message}</p>
			<Button
				variant="ghost"
				size="icon-xs"
				aria-label="Dismiss"
				onclick={() => toaster.dismiss(item.id)}
			>
				<X />
			</Button>
		</div>
	{/each}
</div>
