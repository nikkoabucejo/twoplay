<script lang="ts">
	import { CircleQuestionMark } from "@lucide/svelte";
	import type { Snippet } from "svelte";
	import { buttonVariants, Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui";

	let { rules }: { rules: Snippet } = $props();
</script>

<Popover>
	<PopoverTrigger aria-label="Rules" class={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
		<CircleQuestionMark />
	</PopoverTrigger>
	<PopoverContent side="bottom" sideOffset={8} class="w-64 p-3 text-sm">
		{@render rules()}
	</PopoverContent>
</Popover>
