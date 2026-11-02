<script lang="ts" module>
	import { cn } from "$lib/utils/style";

	export type ChessIconProps = {
		class?: string;
	};
</script>

<script lang="ts">
	let { class: className }: ChessIconProps = $props();

	const id = $props.id();
</script>

{#snippet knight()}
	<path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
	<path
		d="M16.5 18c1-2 2.5-5 2.5-9a7 7 0 0 0-7-7H6.635a1 1 0 0 0-.768 1.64L7 5l-2.32 5.802a2 2 0 0 0 .95 2.526l2.87 1.456"
	/>
	<path d="m15 5 1.425-1.425" />
	<path d="m17 8 1.53-1.53" />
	<path d="M9.713 12.185 7 18" />
{/snippet}

<!-- Lucide's chess-knight, split diagonally into the two seat colors. -->
<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={cn("lucide", className)}
	aria-hidden="true"
>
	<defs>
		<clipPath id="{id}-seat-0"><polygon points="0,0 15,0 9,24 0,24" /></clipPath>
		<clipPath id="{id}-seat-1"><polygon points="15,0 24,0 24,24 9,24" /></clipPath>
	</defs>
	<g class="chess-knight-nod">
		<g clip-path="url(#{id}-seat-0)" stroke="#00e5ff">{@render knight()}</g>
		<g clip-path="url(#{id}-seat-1)" stroke="#ff0080">{@render knight()}</g>
	</g>
</svg>

<style>
	.chess-knight-nod {
		transform-box: fill-box;
		transform-origin: 50% 100%;
	}

	@media (prefers-reduced-motion: no-preference) {
		.chess-knight-nod {
			animation: chess-nod 3.2s ease-in-out infinite;
		}
	}

	@keyframes chess-nod {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(4deg);
		}
	}
</style>
