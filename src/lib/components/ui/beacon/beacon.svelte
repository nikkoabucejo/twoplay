<script lang="ts" module>
	export type BeaconProps = {
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils/style";

	let { class: className }: BeaconProps = $props();
</script>

<span class={cn("relative flex size-1.5", className)} aria-hidden="true">
	<span class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75"
	></span>
	<span class="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
</span>
