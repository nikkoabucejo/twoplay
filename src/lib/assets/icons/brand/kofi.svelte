<script lang="ts" module>
	import { cn } from "$lib/utils/style";

	export type KofiIconProps = {
		class?: string;
	};
</script>

<script lang="ts">
	let { class: className }: KofiIconProps = $props();
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={cn("lucide", className)}
	aria-hidden="true"
>
	<path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Z" />
	<path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
	<path
		d="M10.5 15.5l-2.2-2.1a1.35 1.35 0 0 1 2.2-1.55a1.35 1.35 0 0 1 2.2 1.55Z"
		fill="#ff5e5b"
		stroke="none"
	/>
</svg>
